import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    isPendingReview: integer("is_pending_review", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("scenarios_is_pending_review_check", sql`${table.isPendingReview} in (0, 1)`),
    index("scenarios_is_pending_review_idx").on(table.isPendingReview),
  ],
);
