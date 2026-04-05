import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { knowledgeItems } from "./knowledge-items";
import { sessionHistory } from "./session-history";

export const sessionKnowledgePointOccurrences = sqliteTable(
  "session_knowledge_point_occurrences",
  {
    id: text("id").primaryKey(),
    sessionHistoryId: text("session_history_id")
      .notNull()
      .references(() => sessionHistory.id, { onDelete: "cascade" }),
    knowledgeItemId: text("knowledge_item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    speaker: text("speaker", { enum: ["user", "agent"] }).notNull(),
    transcriptTurnIndex: integer("transcript_turn_index").notNull(),
    excerpt: text("excerpt").notNull(),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
  },
  (table) => ({
    sessionHistoryIdx: index("session_knowledge_point_occurrences_session_history_idx").on(table.sessionHistoryId),
    knowledgeItemIdx: index("session_knowledge_point_occurrences_knowledge_item_idx").on(table.knowledgeItemId),
    turnIdx: index("session_knowledge_point_occurrences_turn_idx").on(
      table.sessionHistoryId,
      table.transcriptTurnIndex,
    ),
    uniqueOccurrence: uniqueIndex("session_knowledge_point_occurrences_unique_idx").on(
      table.sessionHistoryId,
      table.knowledgeItemId,
      table.speaker,
      table.transcriptTurnIndex,
      table.excerpt,
    ),
    occurrenceCountCheck: check(
      "session_knowledge_point_occurrences_occurrence_count_check",
      sql`${table.occurrenceCount} >= 1`,
    ),
    speakerCheck: check(
      "session_knowledge_point_occurrences_speaker_check",
      sql`${table.speaker} in ('user', 'agent')`,
    ),
    transcriptTurnIndexCheck: check(
      "session_knowledge_point_occurrences_turn_index_check",
      sql`${table.transcriptTurnIndex} >= 0`,
    ),
  }),
);
