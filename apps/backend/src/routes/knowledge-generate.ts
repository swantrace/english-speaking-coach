import {
  createKnowledgeGenerateEventsUrl,
  type KnowledgeGenerateSubmissionResponse,
  type KnowledgeGenerateSubmissionResult,
  knowledgeGenerateDefaultEventsLimit,
  knowledgeGenerateEventsQuerySchema,
  knowledgeGenerateEventsSubscriberPrefix,
  knowledgeGenerateSubmissionItemSchema,
  knowledgeGenerateSubmissionResponseSchema,
  knowledgeGenerateSubmissionTransportRequestSchema,
} from "@english-coach/contract/knowledge-generate";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import {
  createKnowledgeGenerateSubmission,
  getKnowledgeGenerateSnapshots,
  type KnowledgeGenerateJobData,
  type KnowledgeGenerateProgressMessage,
  knowledgeGenerateJobName,
  knowledgeGenerateProgressChannel,
  knowledgeGenerateQueue,
  knowledgeGenerateUpdatedEvent,
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
            error:
              "Each item requires a non-empty string message, optional string queuedAt, and optional boolean shouldFail",
            index,
            status: "invalid_input",
            submissionId,
          };
        }

        try {
          const jobId = crypto.randomUUID();

          await knowledgeGenerateQueue.add(knowledgeGenerateJobName, payload, {
            jobId,
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
}
