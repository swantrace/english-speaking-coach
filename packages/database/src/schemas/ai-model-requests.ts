import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { knowledgeItems } from "./knowledge-items";
import { scenarios } from "./scenarios";
import { sessionHistory } from "./session-history";
import { submissions } from "./submissions";

export const aiModelRequestStatusValues = ["started", "completed", "failed"] as const;

export const aiModelRequests = sqliteTable(
  "ai_model_requests",
  {
    completedAt: text("completed_at"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheWriteTokens: integer("cache_write_tokens"),
    error: text("error", { mode: "json" }),
    id: text("id").primaryKey(),
    input: text("input", { mode: "json" }),
    inputTokens: integer("input_tokens"),
    knowledgeItemId: text("knowledge_item_id").references(() => knowledgeItems.id, { onDelete: "set null" }),
    latencyMs: integer("latency_ms"),
    metadata: text("metadata", { mode: "json" }),
    modelId: text("model_id").notNull(),
    operation: text("operation").notNull(),
    output: text("output", { mode: "json" }),
    outputTokens: integer("output_tokens"),
    providerId: text("provider_id").notNull(),
    rawOutput: text("raw_output", { mode: "json" }),
    reasoningTokens: integer("reasoning_tokens"),
    scenarioId: text("scenario_id").references(() => scenarios.id, { onDelete: "set null" }),
    sessionHistoryId: text("session_history_id").references(() => sessionHistory.id, { onDelete: "set null" }),
    startedAt: text("started_at").notNull(),
    status: text("status", { enum: aiModelRequestStatusValues }).notNull(),
    submissionId: text("submission_id").references(() => submissions.id, { onDelete: "set null" }),
    submissionJobId: text("submission_job_id"),
    totalTokens: integer("total_tokens"),
    usage: text("usage", { mode: "json" }),
  },
  (table) => [
    index("ai_model_requests_operation_idx").on(table.operation),
    index("ai_model_requests_provider_model_idx").on(table.providerId, table.modelId),
    index("ai_model_requests_session_history_idx").on(table.sessionHistoryId),
    index("ai_model_requests_submission_idx").on(table.submissionId),
    index("ai_model_requests_submission_job_idx").on(table.submissionJobId),
    index("ai_model_requests_status_idx").on(table.status),
  ],
);
