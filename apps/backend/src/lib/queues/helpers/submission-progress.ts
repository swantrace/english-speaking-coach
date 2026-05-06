import { db, sqlite } from "@english-coach/database";
import { submissionJobs, submissions } from "@english-coach/database/schema";
import type { z } from "zod";
import type { JobProgressBaseMessage, JobProgressMessage } from "./progress";

export type SubmissionJobData = {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type SubmissionProgressMessage = JobProgressMessage & {
  cursor: number;
  submissionId: string;
};

type SubmissionSnapshotRow = {
  cursor: number;
  error: string | null;
  job_id: string;
  kind: string;
  message: string;
  processed_at: string | null;
  progress: number;
  queued_at: string;
  status: string;
  submission_id: string;
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
      jobId: message.jobId,
      message: message.message,
      processedAt: message.processedAt,
      progress: message.progress,
      queuedAt,
      status: message.status,
      submissionId: message.submissionId,
    })
    .onConflictDoUpdate({
      set: {
        error: message.error,
        message: message.message,
        processedAt: message.processedAt,
        progress: message.progress,
        queuedAt,
        status: message.status,
        submissionId: message.submissionId,
      },
      target: submissionJobs.jobId,
    });

  sqlite.query("update submissions set updated_at = ? where id = ?").run(updatedAt, message.submissionId);
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
  const query =
    typeof cursor === "number"
      ? sqlite.query(
          [
            "select cursor, error, job_id, kind, message, processed_at, progress, queued_at, status, submission_id",
            "from submission_jobs",
            "where submission_id = ? and cursor > ?",
            "order by cursor asc",
            "limit ?",
          ].join(" "),
        )
      : sqlite.query(
          [
            "select cursor, error, job_id, kind, message, processed_at, progress, queued_at, status, submission_id",
            "from submission_jobs",
            "where submission_id = ?",
            "order by cursor asc",
            "limit ?",
          ].join(" "),
        );

  const snapshots = (
    typeof cursor === "number" ? query.all(submissionId, cursor, limit) : query.all(submissionId, limit)
  ) as SubmissionSnapshotRow[];

  return snapshots.map((snapshot) =>
    schema.parse({
      cursor: snapshot.cursor,
      error: snapshot.error ?? undefined,
      jobId: snapshot.job_id,
      kind: snapshot.kind,
      message: snapshot.message,
      processedAt: snapshot.processed_at ?? undefined,
      progress: snapshot.progress,
      queuedAt: snapshot.queued_at,
      status: snapshot.status,
      submissionId: snapshot.submission_id,
    }),
  );
}
