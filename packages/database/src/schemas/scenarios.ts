import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { mediaAssets } from "./media-assets";

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
    /** Lightweight labels used for browsing/filtering scenarios in the UI. */
    tags: text("tags", { mode: "json" }).notNull().$type<string[]>().default(sql`'[]'`),
    /** Optional card/detail image URL for the scenario. */
    imageUrl: text("image_url"),
    /** Private image stored in S3-compatible storage. Legacy imageUrl remains supported during migration. */
    imageAssetId: text("image_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    /** Soft-delete marker; null means visible. */
    deletedAt: text("deleted_at"),
    isPendingReview: integer("is_pending_review", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("scenarios_is_pending_review_check", sql`${table.isPendingReview} in (0, 1)`),
    index("scenarios_deleted_at_idx").on(table.deletedAt),
    index("scenarios_is_pending_review_idx").on(table.isPendingReview),
    index("scenarios_image_asset_id_idx").on(table.imageAssetId),
  ],
);
