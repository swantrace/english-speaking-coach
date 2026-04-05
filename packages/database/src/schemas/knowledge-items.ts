import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const knowledgeItemReviewStatusValues = ["pending_review", "approved", "rejected"] as const;

export const knowledgeItems = sqliteTable(
  "knowledge_items",
  {
    id: text("id").primaryKey(),
    /** e.g. "I'd like <np>", "it's worth <v_ing>" — UNIQUE so workers can upsert by pattern. */
    pattern: text("pattern").notNull().unique(),
    syntaxRole: text("syntax_role"),
    fixednessLevel: text("fixedness_level"),
    communicativeFunction: text("communicative_function"),
    example: text("example"),
    /** "admin" = manually managed; "auto_generated" = created by lingAnalysis worker, pending review. */
    source: text("source", { enum: ["admin", "auto_generated"] }).notNull(),
    reviewStatus: text("review_status", { enum: knowledgeItemReviewStatusValues }).notNull().default("approved"),
    reviewedAt: text("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id"),
    submissionId: text("submission_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    patternIdx: uniqueIndex("knowledge_items_pattern_idx").on(table.pattern),
    reviewStatusCheck: check(
      "knowledge_items_review_status_check",
      sql`${table.reviewStatus} in ('pending_review', 'approved', 'rejected')`,
    ),
    reviewStatusIdx: index("knowledge_items_review_status_idx").on(table.reviewStatus),
    sourceCheck: check("knowledge_items_source_check", sql`${table.source} in ('admin', 'auto_generated')`),
    sourceIdx: index("knowledge_items_source_idx").on(table.source),
    submissionIdx: index("knowledge_items_submission_id_idx").on(table.submissionId),
    syntaxRoleCheck: check(
      "knowledge_items_syntax_role_check",
      sql`${table.syntaxRole} IS NULL OR ${table.syntaxRole} in ('predicate_verb', 'predicate_adjective', 'adverbial_modifier', 'noun_phrase', 'discourse_linker', 'clause_pattern')`,
    ),
    fixednessLevelCheck: check(
      "knowledge_items_fixedness_level_check",
      sql`${table.fixednessLevel} IS NULL OR ${table.fixednessLevel} in ('restricted_collocation', 'fixed_expression', 'idiom')`,
    ),
    communicativeFunctionCheck: check(
      "knowledge_items_communicative_function_check",
      sql`${table.communicativeFunction} IS NULL OR ${table.communicativeFunction} in ('manage_social_relation', 'express_attitude_or_opinion', 'make_request_or_offer', 'give_or_seek_information', 'organize_discourse', 'react_in_conversation', 'express_degree_or_soften', 'express_time_or_sequence')`,
    ),
  }),
);
