import {
  type JobProgressMessage,
  jobProgressMessageSchema,
  jobProgressStatuses,
} from "@english-coach/contract/job-events";
import { knowledgeGenerateProgressChannel as knowledgeGenerateDefaultProgressChannel } from "@english-coach/contract/knowledge";
import { scenarioGenerateProgressChannel as scenarioGenerateDefaultProgressChannel } from "@english-coach/contract/scenario";
import { db } from "@english-coach/database";
import { submissionJobs, submissions } from "@english-coach/database/schema";
import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import type { BackendApp } from "../../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery, pageListQuerySchema } from "../../http/pagination";
import { streamChannelJobProgressSSE } from "../../lib/sse/job-events";

const submissionKindValues = ["scenario.generate", "knowledge.generate", "session.analysis"] as const;

const adminSubmissionListQuerySchema = pageListQuerySchema.extend({
  kind: z.enum(submissionKindValues).optional(),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

const adminJobListQuerySchema = pageListQuerySchema.extend({
  kind: z.enum(submissionKindValues).optional(),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  status: z.enum(jobProgressStatuses).optional(),
});

type SubmissionRecord = typeof submissions.$inferSelect;
type SubmissionJobRecord = typeof submissionJobs.$inferSelect;

type AdminSubmissionJobStreamMessage = JobProgressMessage & {
  cursor?: number;
  input?: unknown;
  knowledgeItemId?: string | null;
  output?: unknown;
  scenarioId?: string | null;
  sessionHistoryId?: string | null;
  submissionId: string;
};

function createSubmissionSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(like(submissions.id, pattern), like(submissions.userId, pattern));
}

function createJobSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(like(submissionJobs.jobId, pattern), like(submissionJobs.message, pattern));
}

function mapSubmissionSummary(submission: SubmissionRecord) {
  return {
    createdAt: submission.createdAt,
    id: submission.id,
    kind: submission.kind,
    totalCount: submission.totalCount,
    updatedAt: submission.updatedAt,
    userId: submission.userId ?? null,
  };
}

function mapJob(job: SubmissionJobRecord) {
  return {
    error: job.error ?? null,
    id: String(job.id),
    input: job.input ?? undefined,
    jobId: job.jobId,
    kind: job.kind,
    knowledgeItemId: job.knowledgeItemId ?? null,
    message: job.message,
    output: job.output ?? undefined,
    processedAt: job.processedAt ?? null,
    progress: job.progress,
    queuedAt: job.queuedAt,
    scenarioId: job.scenarioId ?? null,
    sessionHistoryId: job.sessionHistoryId ?? null,
    status: job.status,
    submissionId: job.submissionId,
  };
}

function mapJobStreamMessage(job: SubmissionJobRecord): AdminSubmissionJobStreamMessage {
  return {
    input: job.input ?? undefined,
    jobId: job.jobId,
    kind: job.kind,
    knowledgeItemId: job.knowledgeItemId ?? null,
    message: job.message,
    output: job.output ?? undefined,
    progress: job.progress,
    scenarioId: job.scenarioId ?? null,
    sessionHistoryId: job.sessionHistoryId ?? null,
    status: job.status,
    submissionId: job.submissionId,
    cursor: job.cursor,
    error: job.error ?? undefined,
    processedAt: job.processedAt ?? undefined,
    queuedAt: job.queuedAt,
  };
}

function getProgressChannel(kind: SubmissionRecord["kind"]) {
  switch (kind) {
    case "knowledge.generate":
      return process.env.KNOWLEDGE_GENERATE_PROGRESS_CHANNEL ?? knowledgeGenerateDefaultProgressChannel;
    case "scenario.generate":
      return process.env.SCENARIO_GENERATE_PROGRESS_CHANNEL ?? scenarioGenerateDefaultProgressChannel;
    case "session.analysis":
      return null;
  }
}

async function getSubmissionById(submissionId: string) {
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);

  return submission ?? null;
}

export function registerAdminSubmissionRoutes(app: BackendApp) {
  // List submissions across generation and analysis workflows.
  app.get("/api/admin/submissions", async (context) => {
    const parsedQuery = adminSubmissionListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid submission query parameters" }, 400);
    }

    const { kind, page, pageSize, search } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const conditions = [kind ? eq(submissions.kind, kind) : null, createSubmissionSearchCondition(search)].filter(
      (condition): condition is NonNullable<typeof condition> => Boolean(condition),
    );
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [submissionRows, totalResult] = await Promise.all([
      db
        .select()
        .from(submissions)
        .where(whereCondition)
        .orderBy(desc(submissions.updatedAt), desc(submissions.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(submissions).where(whereCondition),
    ]);

    const submissionIds = submissionRows.map((submission) => submission.id);
    const jobRows =
      submissionIds.length > 0
        ? await db.select().from(submissionJobs).where(inArray(submissionJobs.submissionId, submissionIds))
        : [];
    const jobCountsBySubmissionId = new Map<
      string,
      {
        completedJobs: number;
        failedJobs: number;
        queuedJobs: number;
        startedJobs: number;
      }
    >();

    for (const job of jobRows) {
      const counts = jobCountsBySubmissionId.get(job.submissionId) ?? {
        completedJobs: 0,
        failedJobs: 0,
        queuedJobs: 0,
        startedJobs: 0,
      };

      if (job.status === "completed") counts.completedJobs += 1;
      if (job.status === "failed") counts.failedJobs += 1;
      if (job.status === "queued") counts.queuedJobs += 1;
      if (job.status === "started") counts.startedJobs += 1;

      jobCountsBySubmissionId.set(job.submissionId, counts);
    }

    return context.json(
      createPageResponse(
        submissionRows.map((submission) => ({
          ...mapSubmissionSummary(submission),
          ...(jobCountsBySubmissionId.get(submission.id) ?? {
            completedJobs: 0,
            failedJobs: 0,
            queuedJobs: 0,
            startedJobs: 0,
          }),
        })),
        totalResult[0]?.total ?? 0,
        page,
        pageSize,
      ),
    );
  });

  // List jobs under a submission.
  app.get("/api/admin/submissions/:submissionId/jobs", async (context) => {
    const parsedQuery = adminJobListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid job query parameters" }, 400);
    }

    const submissionId = context.req.param("submissionId");
    const submission = await getSubmissionById(submissionId);

    if (!submission) {
      return context.json({ error: "Submission not found" }, 404);
    }

    const { kind, page, pageSize, search, status } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const conditions = [
      eq(submissionJobs.submissionId, submissionId),
      kind ? eq(submissionJobs.kind, kind) : null,
      status ? eq(submissionJobs.status, status) : null,
      createJobSearchCondition(search),
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
    const whereCondition = and(...conditions);

    const [jobRows, totalResult] = await Promise.all([
      db
        .select()
        .from(submissionJobs)
        .where(whereCondition)
        .orderBy(desc(submissionJobs.cursor), desc(submissionJobs.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(submissionJobs).where(whereCondition),
    ]);

    return context.json({
      ...createPageResponse(jobRows.map(mapJob), totalResult[0]?.total ?? 0, page, pageSize),
      submission: mapSubmissionSummary(submission),
    });
  });

  // Fetch one job under a submission.
  app.get("/api/admin/submissions/:submissionId/jobs/:jobId", async (context) => {
    const submissionId = context.req.param("submissionId");
    const jobId = context.req.param("jobId");
    const submission = await getSubmissionById(submissionId);

    if (!submission) {
      return context.json({ error: "Submission not found" }, 404);
    }

    const [job] = await db
      .select()
      .from(submissionJobs)
      .where(and(eq(submissionJobs.submissionId, submissionId), eq(submissionJobs.jobId, jobId)))
      .limit(1);

    if (!job) {
      return context.json({ error: "Submission job not found" }, 404);
    }

    return context.json({
      ...mapJob(job),
      submission: mapSubmissionSummary(submission),
    });
  });

  // Stream live job updates for a submission.
  app.get("/api/admin/submissions/:submissionId/stream", async (context) => {
    const submissionId = context.req.param("submissionId");
    const submission = await getSubmissionById(submissionId);

    if (!submission) {
      return context.json({ error: "Submission not found" }, 404);
    }

    const channel = getProgressChannel(submission.kind);

    if (!channel) {
      return context.json({ error: "Submission kind does not expose a live stream yet" }, 404);
    }

    return streamChannelJobProgressSSE<AdminSubmissionJobStreamMessage>(context, {
      channel,
      eventName: "job.updated",
      getInitialMessages: async () => {
        const jobRows = await db
          .select()
          .from(submissionJobs)
          .where(eq(submissionJobs.submissionId, submissionId))
          .orderBy(submissionJobs.cursor);

        return jobRows.map(mapJobStreamMessage);
      },
      getMessageId: (message) => String(message.cursor ?? message.jobId),
      shouldIncludeMessage: (message) => {
        const parsed = jobProgressMessageSchema.safeParse(message);

        return parsed.success && message.submissionId === submissionId;
      },
      subscriberName: `admin.submissions.${submissionId}`,
    });
  });
}
