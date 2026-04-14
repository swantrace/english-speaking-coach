import { submissionJobStatusValues } from "@english-coach/domain";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { knowledgeItems } from "./knowledge-items";
import { scenarios } from "./scenarios";
import { sessionHistory } from "./session-history";
import { submissions } from "./submissions";

const submissionJobStatusValuesSql = sql.raw(
  submissionJobStatusValues.map((value) => `'${value.replaceAll("'", "''")}'`).join(", "),
);

export const submissionJobs = sqliteTable(
  "submission_jobs",
  {
    cursor: integer("cursor").notNull(),
    error: text("error"),
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id").notNull(),
    kind: text("kind").notNull(),
    input: text("input", { mode: "json" }),
    output: text("output", { mode: "json" }),
    message: text("message").notNull(),
    processedAt: text("processed_at"),
    progress: integer("progress").notNull(),
    queuedAt: text("queued_at").notNull(),
    sessionHistoryId: text("session_history_id").references(() => sessionHistory.id, { onDelete: "set null" }),
    scenarioId: text("scenario_id").references(() => scenarios.id, { onDelete: "set null" }),
    knowledgeItemId: text("knowledge_item_id").references(() => knowledgeItems.id, { onDelete: "set null" }),
    status: text("status", { enum: submissionJobStatusValues }).notNull(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("submission_jobs_submission_cursor_idx").on(table.submissionId, table.cursor),
    uniqueIndex("submission_jobs_job_id_idx").on(table.jobId),
    check(
      "submission_jobs_status_check",
      sql`${table.status} in (${submissionJobStatusValuesSql})`,
    ),
    index("submission_jobs_submission_idx").on(table.submissionId),
    index("submission_jobs_session_history_idx").on(table.sessionHistoryId),
    index("submission_jobs_scenario_idx").on(table.scenarioId),
    index("submission_jobs_knowledge_item_idx").on(table.knowledgeItemId),
  ],
);
