import {
  communicativeFunctionValues,
  fixednessLevelValues,
  knowledgeOccurrenceStatusValues,
  patternTypeValues,
} from "@english-coach/domain";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { knowledgeItems } from "./knowledge-items";
import { sessionHistory } from "./session-history";

const knowledgeOccurrenceStatusValuesSql = sql.raw(
  knowledgeOccurrenceStatusValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "),
);
const patternTypeValuesSql = sql.raw(patternTypeValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "));
const fixednessLevelValuesSql = sql.raw(
  fixednessLevelValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "),
);
const communicativeFunctionValuesSql = sql.raw(
  communicativeFunctionValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "),
);

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
    proposedPatternType: text("proposed_pattern_type", { enum: patternTypeValues }),
    proposedFixednessLevel: text("proposed_fixedness_level", { enum: fixednessLevelValues }),
    proposedCommunicativeFunction: text("proposed_communicative_function", {
      enum: communicativeFunctionValues,
    }),
    proposedSenses: text("proposed_senses", { mode: "json" }).$type<
      Array<{
        order: number;
        meaning_en: string;
        meaning_zh: string;
        grammatical_note?: string;
        example: string;
        example_zh: string;
      }>
    >(),
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
    check(
      "session_knowledge_point_occurrences_pattern_type_check",
      sql`${table.proposedPatternType} IS NULL OR ${table.proposedPatternType} in (${patternTypeValuesSql})`,
    ),
    check(
      "session_knowledge_point_occurrences_fixedness_level_check",
      sql`${table.proposedFixednessLevel} IS NULL OR ${table.proposedFixednessLevel} in (${fixednessLevelValuesSql})`,
    ),
    check(
      "session_knowledge_point_occurrences_communicative_function_check",
      sql`${table.proposedCommunicativeFunction} IS NULL OR ${table.proposedCommunicativeFunction} in (${communicativeFunctionValuesSql})`,
    ),
    check("session_knowledge_point_occurrences_utterance_check", sql`length(trim(${table.utterance})) > 0`),
    check("session_knowledge_point_occurrences_turn_index_check", sql`${table.transcriptTurnIndex} >= 0`),
    check(
      "session_knowledge_point_occurrences_status_check",
      sql`${table.status} in (${knowledgeOccurrenceStatusValuesSql})`,
    ),
  ],
);
