import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { knowledgeItems } from "./knowledge-items";
import { sessionHistory } from "./session-history";

export const speakerValues = ["user", "assistant"] as const;

export const sessionKnowledgeItems = sqliteTable(
  "session_knowledge_items",
  {
    id: text("id").primaryKey(),
    sessionHistoryId: text("session_history_id")
      .notNull()
      .references(() => sessionHistory.id, { onDelete: "cascade" }),
    knowledgeItemId: text("knowledge_item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    /** Whose turn the item was extracted from: "user" = active production, "assistant" = target language modelled. */
    speaker: text("speaker", { enum: speakerValues }).notNull(),
    count: integer("count").notNull(),
    /** string[] of utterance excerpts where the item appeared. */
    examples: text("examples", { mode: "json" }).notNull().$type<string[]>(),
  },
  (table) => [
    uniqueIndex("session_knowledge_items_unique_idx").on(table.sessionHistoryId, table.knowledgeItemId, table.speaker),
    check("session_knowledge_items_speaker_check", sql`${table.speaker} in ('user', 'agent')`),
  ],
);
