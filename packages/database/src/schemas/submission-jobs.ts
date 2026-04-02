import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { submissions } from "./submissions";

export const submissionJobStatusValues = ["queued", "started", "completed", "failed"] as const;

export const submissionJobs = sqliteTable(
  "submission_jobs",
  {
    cursor: integer("cursor").notNull(),
    error: text("error"),
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id").notNull(),
    message: text("message").notNull(),
    processedAt: text("processed_at"),
    progress: integer("progress").notNull(),
    queuedAt: text("queued_at").notNull(),
    status: text("status", { enum: submissionJobStatusValues }).notNull(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    cursorBySubmissionIdx: uniqueIndex("submission_jobs_submission_cursor_idx").on(table.submissionId, table.cursor),
    jobIdIdx: uniqueIndex("submission_jobs_job_id_idx").on(table.jobId),
    statusCheck: check(
      "submission_jobs_status_check",
      sql`${table.status} in ('queued', 'started', 'completed', 'failed')`,
    ),
    submissionIdx: index("submission_jobs_submission_idx").on(table.submissionId),
  }),
);
