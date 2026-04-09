import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scenarioSourceValues = ["admin", "auto_generated"] as const;
export const scenarioReviewStatusValues = ["pending_review", "approved", "rejected"] as const;

export const scenarios = sqliteTable(
  "scenarios",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    /** Scene-setting text: browser card subtitle + agent prompt input. */
    setting: text("setting").notNull(),
    /** Always exactly two characters: [{ name, description }, { name, description }] */
    characters: text("characters", { mode: "json" })
      .notNull()
      .$type<[{ name: string; description: string }, { name: string; description: string }]>(),
    /**
     * Goal definitions only — no runtime status.
     * Shape: { intents: string[], slots: string[], goals: Array<{ id, description, optional?, logic: { required_intents, required_slots } }> }
     */
    goals: text("goals", { mode: "json" }).notNull().$type<{
      intents: string[];
      slots: string[];
      goals: Array<{
        id: string;
        description: string;
        optional?: boolean;
        logic: { required_intents: string[]; required_slots: string[] };
      }>;
    }>(),
    /** Pre-written model dialogue shown on the scenario detail page before practice. */
    exampleDialogue: text("example_dialogue", { mode: "json" })
      .notNull()
      .$type<Array<{ characterIndex: 0 | 1; text: string }>>(),
    source: text("source", { enum: scenarioSourceValues }).notNull().default("admin"),
    reviewStatus: text("review_status", { enum: scenarioReviewStatusValues }).notNull().default("approved"),
    reviewedAt: text("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id"),
    submissionId: text("submission_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("scenarios_review_status_check", sql`${table.reviewStatus} in ('pending_review', 'approved', 'rejected')`),
    index("scenarios_review_status_idx").on(table.reviewStatus),
    check("scenarios_source_check", sql`${table.source} in ('admin', 'auto_generated')`),
    index("scenarios_source_idx").on(table.source),
    index("scenarios_submission_id_idx").on(table.submissionId),
  ],
);
