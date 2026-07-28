import { db } from "@english-coach/database";
import { submissionJobs, submissions } from "@english-coach/database/schema";
import { and, asc, eq, gt } from "drizzle-orm";
import type { z } from "zod";
import type { JobProgressBaseMessage, JobProgressMessage } from "./progress";

export type SubmissionJobData = {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type SubmissionProgressMessage = JobProgressMessage & {
  cursor: number;
  input?: unknown;
  knowledgeItemId?: string | null;
  output?: unknown;
  scenarioId?: string | null;
  sessionHistoryId?: string | null;
  submissionId: string;
};

type SubmissionKind = typeof submissions.$inferInsert.kind;

export function createSubmissionProgressMessage<TMessage extends SubmissionProgressMessage>({
  jobData,
  kind,
  progress,
  schema,
}: {
  jobData: Pick<SubmissionJobData, "cursor" | "submissionId">;
  kind: string;
  progress: JobProgressBaseMessage;
  schema: z.ZodType<TMessage>;
}) {
  return schema.parse({
    ...progress,
    cursor: jobData.cursor,
    kind,
    submissionId: jobData.submissionId,
  });
}

export async function createSubmissionRecord({
  kind,
  submissionId,
  totalCount,
  userId,
}: {
  kind: SubmissionKind;
  submissionId: string;
  totalCount: number;
  userId?: string | null;
}) {
  const now = new Date().toISOString();

  await db.insert(submissions).values({
    createdAt: now,
    id: submissionId,
    kind,
    totalCount,
    updatedAt: now,
    userId: userId ?? null,
  });
}

export async function saveSubmissionProgressSnapshot(message: SubmissionProgressMessage) {
  const updatedAt = new Date().toISOString();
  const queuedAt = message.queuedAt ?? updatedAt;

  await db
    .insert(submissionJobs)
    .values({
      kind: message.kind,
      cursor: message.cursor,
      error: message.error,
      input: message.input,
      jobId: message.jobId,
      knowledgeItemId: message.knowledgeItemId ?? null,
      message: message.message,
      output: message.output,
      processedAt: message.processedAt,
      progress: message.progress,
      queuedAt,
      scenarioId: message.scenarioId ?? null,
      sessionHistoryId: message.sessionHistoryId ?? null,
      status: message.status,
      submissionId: message.submissionId,
    })
    .onConflictDoUpdate({
      set: {
        error: message.error,
        input: message.input,
        knowledgeItemId: message.knowledgeItemId ?? null,
        message: message.message,
        output: message.output,
        processedAt: message.processedAt,
        progress: message.progress,
        queuedAt,
        scenarioId: message.scenarioId ?? null,
        sessionHistoryId: message.sessionHistoryId ?? null,
        status: message.status,
        submissionId: message.submissionId,
      },
      target: submissionJobs.jobId,
    });

  await db.update(submissions).set({ updatedAt }).where(eq(submissions.id, message.submissionId));
}

export async function getSubmissionProgressSnapshots<TMessage extends SubmissionProgressMessage>({
  cursor,
  limit,
  schema,
  submissionId,
}: {
  cursor?: number;
  limit: number;
  schema: z.ZodType<TMessage>;
  submissionId: string;
}): Promise<TMessage[]> {
  const snapshots = await db
    .select()
    .from(submissionJobs)
    .where(
      typeof cursor === "number"
        ? and(eq(submissionJobs.submissionId, submissionId), gt(submissionJobs.cursor, cursor))
        : eq(submissionJobs.submissionId, submissionId),
    )
    .orderBy(asc(submissionJobs.cursor))
    .limit(limit);

  return snapshots.map((snapshot) =>
    schema.parse({
      cursor: snapshot.cursor,
      error: snapshot.error ?? undefined,
      input: snapshot.input ?? undefined,
      jobId: snapshot.jobId,
      knowledgeItemId: snapshot.knowledgeItemId ?? undefined,
      kind: snapshot.kind,
      message: snapshot.message,
      output: snapshot.output ?? undefined,
      processedAt: snapshot.processedAt ?? undefined,
      progress: snapshot.progress,
      queuedAt: snapshot.queuedAt,
      scenarioId: snapshot.scenarioId ?? undefined,
      sessionHistoryId: snapshot.sessionHistoryId ?? undefined,
      status: snapshot.status,
      submissionId: snapshot.submissionId,
    }),
  );
}
