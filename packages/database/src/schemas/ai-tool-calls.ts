import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { aiModelRequests } from "./ai-model-requests";
import { knowledgeItems } from "./knowledge-items";
import { scenarios } from "./scenarios";
import { sessionHistory } from "./session-history";
import { submissions } from "./submissions";

export const aiToolCallStatusValues = ["started", "completed", "failed"] as const;

export const aiToolCalls = sqliteTable(
  "ai_tool_calls",
  {
    aiModelRequestId: text("ai_model_request_id").references(() => aiModelRequests.id, { onDelete: "set null" }),
    completedAt: text("completed_at"),
    error: text("error", { mode: "json" }),
    id: text("id").primaryKey(),
    input: text("input", { mode: "json" }),
    knowledgeItemId: text("knowledge_item_id").references(() => knowledgeItems.id, { onDelete: "set null" }),
    latencyMs: integer("latency_ms"),
    metadata: text("metadata", { mode: "json" }),
    output: text("output", { mode: "json" }),
    scenarioId: text("scenario_id").references(() => scenarios.id, { onDelete: "set null" }),
    sessionHistoryId: text("session_history_id").references(() => sessionHistory.id, { onDelete: "set null" }),
    startedAt: text("started_at").notNull(),
    status: text("status", { enum: aiToolCallStatusValues }).notNull(),
    submissionId: text("submission_id").references(() => submissions.id, { onDelete: "set null" }),
    submissionJobId: text("submission_job_id"),
    toolCallId: text("tool_call_id"),
    toolName: text("tool_name").notNull(),
  },
  (table) => [
    index("ai_tool_calls_ai_model_request_idx").on(table.aiModelRequestId),
    index("ai_tool_calls_session_history_idx").on(table.sessionHistoryId),
    index("ai_tool_calls_status_idx").on(table.status),
    index("ai_tool_calls_submission_idx").on(table.submissionId),
    index("ai_tool_calls_tool_call_id_idx").on(table.toolCallId),
    index("ai_tool_calls_tool_name_idx").on(table.toolName),
  ],
);
