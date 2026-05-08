import {
  createKnowledgeGenerateEventsUrl,
  type KnowledgeGenerateSubmissionResponse,
  type KnowledgeGenerateSubmissionResult,
  knowledgeGenerateDefaultEventsLimit,
  knowledgeGenerateEventsQuerySchema,
  knowledgeGenerateEventsSubscriberPrefix,
  knowledgeGenerateHistoryQuerySchema,
  knowledgeGenerateJobName,
  knowledgeGenerateSubmissionHistoryResponseSchema,
  knowledgeGenerateSubmissionItemSchema,
  knowledgeGenerateSubmissionKind,
  knowledgeGenerateSubmissionResponseSchema,
  knowledgeGenerateSubmissionTransportRequestSchema,
  knowledgeGenerateUpdatedEvent,
} from "@english-coach/contract/knowledge";
import { db } from "@english-coach/database";
import { submissionJobs, submissions } from "@english-coach/database/schema";
import { desc, eq, inArray } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import {
  createKnowledgeGenerateSubmission,
  getKnowledgeGenerateSnapshots,
  type KnowledgeGenerateJobData,
  type KnowledgeGenerateProgressMessage,
  knowledgeGenerateProgressChannel,
  knowledgeGenerateQueue,
  persistQueuedKnowledgeGenerateJob,
} from "../lib/queues/knowledge.generate";
import { streamChannelJobProgressSSE } from "../lib/sse/job-events";

function normalizeGenerateRequestItems(body: unknown): unknown[] {
  const parsedBody = knowledgeGenerateSubmissionTransportRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return [];
  }

  if (
    typeof parsedBody.data === "object" &&
    parsedBody.data !== null &&
    "items" in parsedBody.data &&
    Array.isArray(parsedBody.data.items)
  ) {
    return parsedBody.data.items;
  }

  return [parsedBody.data];
}

function toKnowledgeGeneratePayload(
  item: unknown,
  submissionId: string,
  cursor: number,
): KnowledgeGenerateJobData | null {
  const parsedItem = knowledgeGenerateSubmissionItemSchema.safeParse(item);

  if (!parsedItem.success) {
    return null;
  }

  return {
    cursor,
    ...parsedItem.data,
    queuedAt: parsedItem.data.queuedAt ?? new Date().toISOString(),
    submissionId,
  };
}

function getKnowledgeGenerateSseMaxDurationMs() {
  const rawValue = process.env.KNOWLEDGE_GENERATE_SSE_MAX_DURATION_MS;

  if (!rawValue) {
    return undefined;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return undefined;
  }

  return parsedValue;
}

export function registerKnowledgeGenerateRoutes(app: BackendApp) {
  // Queue one or more prompts for AI-generated knowledge items.
  app.post("/api/admin/knowledge-items/generate", async (context) => {
    const rawBody = await context.req.json<unknown>().catch(() => ({}));
    const items = normalizeGenerateRequestItems(rawBody);
    const submissionId = crypto.randomUUID();
    const currentUser = getAuthenticatedUser(context);

    await createKnowledgeGenerateSubmission(submissionId, items.length === 0 ? 1 : items.length, currentUser?.id);

    if (items.length === 0) {
      const invalidResponse = knowledgeGenerateSubmissionResponseSchema.parse({
        eventsUrl: createKnowledgeGenerateEventsUrl({
          limit: knowledgeGenerateDefaultEventsLimit,
          submissionId,
        }),
        limit: knowledgeGenerateDefaultEventsLimit,
        results: [
          {
            error: "Request body must be a valid knowledge-item prompt or an object with a non-empty items array",
            index: 0,
            status: "invalid_input",
            submissionId,
          } satisfies KnowledgeGenerateSubmissionResult,
        ],
        submissionId,
        summary: {
          enqueueFailed: 0,
          invalid: 1,
          queued: 0,
          total: 1,
        },
      });

      return context.json(invalidResponse, 200);
    }

    const results = await Promise.all(
      items.map(async (item, index): Promise<KnowledgeGenerateSubmissionResult> => {
        const payload = toKnowledgeGeneratePayload(item, submissionId, index);

        if (!payload) {
          return {
            cursor: index,
            error: "Each item requires a non-empty string message, optional string queuedAt",
            index,
            status: "invalid_input",
            submissionId,
          };
        }

        try {
          const jobId = crypto.randomUUID();

          await knowledgeGenerateQueue.add(knowledgeGenerateJobName, payload, {
            jobId,
            removeOnComplete: { age: 86_400, count: 1_000 },
            removeOnFail: false,
          });

          await persistQueuedKnowledgeGenerateJob(jobId, payload);

          return {
            cursor: payload.cursor,
            index,
            jobId,
            payload,
            status: "queued",
            submissionId,
          };
        } catch (error) {
          return {
            cursor: payload.cursor,
            error: error instanceof Error ? error.message : "Failed to enqueue knowledge generation job",
            index,
            payload,
            status: "enqueue_failed",
            submissionId,
          };
        }
      }),
    );

    const responseBody: KnowledgeGenerateSubmissionResponse = knowledgeGenerateSubmissionResponseSchema.parse({
      eventsUrl: createKnowledgeGenerateEventsUrl({
        limit: knowledgeGenerateDefaultEventsLimit,
        submissionId,
      }),
      limit: knowledgeGenerateDefaultEventsLimit,
      results,
      submissionId,
      summary: {
        enqueueFailed: results.filter((result) => result.status === "enqueue_failed").length,
        invalid: results.filter((result) => result.status === "invalid_input").length,
        queued: results.filter((result) => result.status === "queued").length,
        total: results.length,
      },
    });

    return context.json(responseBody, 200);
  });

  // Stream queued knowledge generation progress for a submission over SSE.
  app.get("/api/admin/knowledge-items/generate/events", async (context) => {
    const parsedQuery = knowledgeGenerateEventsQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json(
        {
          error: "Invalid events query parameters",
        },
        400,
      );
    }

    const { cursor, limit, submissionId } = parsedQuery.data;

    return streamChannelJobProgressSSE<KnowledgeGenerateProgressMessage>(context, {
      channel: knowledgeGenerateProgressChannel,
      eventName: knowledgeGenerateUpdatedEvent,
      getInitialMessages: submissionId
        ? () =>
            getKnowledgeGenerateSnapshots({
              cursor,
              limit,
              submissionId,
            })
        : async () => [],
      getMessageId: (message) => String(message.cursor),
      shouldIncludeMessage: submissionId
        ? (message) => message.submissionId === submissionId && (typeof cursor !== "number" || message.cursor > cursor)
        : () => false,
      maxDurationMs: getKnowledgeGenerateSseMaxDurationMs(),
      subscriberName: submissionId
        ? `${knowledgeGenerateEventsSubscriberPrefix}.${submissionId}`
        : `${knowledgeGenerateEventsSubscriberPrefix}.idle`,
    });
  });

  // List recent knowledge generation submissions and their job snapshots.
  app.get("/api/admin/knowledge-items/generate/submissions", async (context) => {
    const parsedQuery = knowledgeGenerateHistoryQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid submission history query parameters" }, 400);
    }

    const { jobsPerSubmission, limit } = parsedQuery.data;
    const submissionRows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.kind, knowledgeGenerateSubmissionKind))
      .orderBy(desc(submissions.updatedAt))
      .limit(limit);

    if (submissionRows.length === 0) {
      return context.json(knowledgeGenerateSubmissionHistoryResponseSchema.parse({ items: [] }));
    }

    const submissionIds = submissionRows.map((submission) => submission.id);
    const jobRows = await db
      .select()
      .from(submissionJobs)
      .where(inArray(submissionJobs.submissionId, submissionIds))
      .orderBy(desc(submissionJobs.id));

    const jobsBySubmissionId = new Map<string, typeof jobRows>();

    for (const job of jobRows) {
      const existingJobs = jobsBySubmissionId.get(job.submissionId) ?? [];
      existingJobs.push(job);
      jobsBySubmissionId.set(job.submissionId, existingJobs);
    }

    return context.json(
      knowledgeGenerateSubmissionHistoryResponseSchema.parse({
        items: submissionRows.map((submission) => {
          const relatedJobs = jobsBySubmissionId.get(submission.id) ?? [];

          return {
            createdAt: submission.createdAt,
            eventsUrl: createKnowledgeGenerateEventsUrl({
              limit: knowledgeGenerateDefaultEventsLimit,
              submissionId: submission.id,
            }),
            id: submission.id,
            jobs: relatedJobs.slice(0, jobsPerSubmission).map((job) => ({
              cursor: job.cursor,
              error: job.error ?? undefined,
              jobId: job.jobId,
              message: job.message,
              processedAt: job.processedAt ?? undefined,
              progress: job.progress,
              queuedAt: job.queuedAt,
              status: job.status,
              submissionId: job.submissionId,
            })),
            summary: {
              completed: relatedJobs.filter((job) => job.status === "completed").length,
              failed: relatedJobs.filter((job) => job.status === "failed").length,
              queued: relatedJobs.filter((job) => job.status === "queued").length,
              started: relatedJobs.filter((job) => job.status === "started").length,
              totalJobs: relatedJobs.length,
            },
            totalCount: submission.totalCount,
            updatedAt: submission.updatedAt,
            userId: submission.userId ?? null,
          };
        }),
      }),
    );
  });
}
