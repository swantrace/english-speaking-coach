import { communicativeFunctionValues, fixednessLevelValues, patternTypeValues } from "@english-coach/domain";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const patternTypeValuesSql = sql.raw(patternTypeValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "));

export const knowledgeItems = sqliteTable(
  "knowledge_items",
  {
    id: text("id").primaryKey(),
    /** e.g. "I'd like <np>", "it's worth <v_ing>" — UNIQUE so workers can upsert by pattern. */
    pattern: text("pattern").notNull().unique(),
    patternType: text("pattern_type", { enum: patternTypeValues }),
    fixednessLevel: text("fixedness_level", { enum: fixednessLevelValues }),
    communicativeFunction: text("communicative_function", { enum: communicativeFunctionValues }),
    isPendingReview: integer("is_pending_review", { mode: "boolean" }).notNull().default(false),
    senses: text("senses", { mode: "json" }).notNull().$type<
      Array<{
        order: number;
        meaning_en: string;
        meaning_zh: string;
        grammatical_note?: string;
        example: string;
        example_zh: string;
      }>
    >(),
    deletedAt: text("deleted_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("knowledge_items_pattern_idx").on(table.pattern),
    index("knowledge_items_is_pending_review_idx").on(table.isPendingReview),
    check(
      "knowledge_items_pattern_type_check",
      sql`${table.patternType} IS NULL OR ${table.patternType} in (${patternTypeValuesSql})`,
    ),
    check(
      "knowledge_items_fixedness_level_check",
      sql`${table.fixednessLevel} IS NULL OR ${table.fixednessLevel} in ('restricted_collocation', 'fixed_expression', 'idiom')`,
    ),
    check(
      "knowledge_items_communicative_function_check",
      sql`${table.communicativeFunction} IS NULL OR ${table.communicativeFunction} in ('manage_social_relation', 'express_attitude_or_opinion', 'make_request_or_offer', 'give_or_seek_information', 'organize_discourse', 'react_in_conversation', 'express_degree_or_soften', 'express_time_or_sequence')`,
    ),
  ],
);
