import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { knowledgeItems } from "./knowledge-items";
import { sessionHistory } from "./session-history";

export const knowledgeOccurrenceStatusValues = ["proposed", "approved", "rejected"] as const;

export const sessionKnowledgePointOccurrences = sqliteTable(
  "session_knowledge_point_occurrences",
  {
    id: text("id").primaryKey(),
    sessionHistoryId: text("session_history_id")
      .notNull()
      .references(() => sessionHistory.id, { onDelete: "cascade" }),
    knowledgeItemId: text("knowledge_item_id").references(() => knowledgeItems.id),
    transcriptTurnIndex: integer("transcript_turn_index").notNull(),
    proposedPattern: text("proposed_pattern").notNull(),
    utterance: text("utterance").notNull(),
    status: text("status", { enum: knowledgeOccurrenceStatusValues }).notNull().default("proposed"),
    reviewedAt: text("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
  },
  (table) => [
    index("session_knowledge_point_occurrences_session_history_idx").on(table.sessionHistoryId),
    index("session_knowledge_point_occurrences_knowledge_item_idx").on(table.knowledgeItemId),
    index("session_knowledge_point_occurrences_unresolved_idx").on(table.knowledgeItemId),
    index("session_knowledge_point_occurrences_turn_idx").on(table.sessionHistoryId, table.transcriptTurnIndex),
    uniqueIndex("session_knowledge_point_occurrences_unique_idx").on(
      table.sessionHistoryId,
      table.transcriptTurnIndex,
      table.proposedPattern,
      table.utterance,
    ),
    check("session_knowledge_point_occurrences_pattern_check", sql`length(trim(${table.proposedPattern})) > 0`),
    check("session_knowledge_point_occurrences_utterance_check", sql`length(trim(${table.utterance})) > 0`),
    check("session_knowledge_point_occurrences_turn_index_check", sql`${table.transcriptTurnIndex} >= 0`),
    check(
      "session_knowledge_point_occurrences_status_check",
      sql`${table.status} in ('proposed', 'approved', 'rejected')`,
    ),
  ],
);
