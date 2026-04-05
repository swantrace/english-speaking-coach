import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const submissionKindValues = ["scenario.generate", "knowledge.generate"] as const;

export const submissions = sqliteTable(
  "submissions",
  {
    createdAt: text("created_at").notNull(),
    id: text("id").primaryKey(),
    kind: text("kind", { enum: submissionKindValues }).notNull(),
    totalCount: integer("total_count").notNull(),
    updatedAt: text("updated_at").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => ({
    kindIdx: index("submissions_kind_idx").on(table.kind),
    kindCheck: check("submissions_kind_check", sql`${table.kind} in ('scenario.generate', 'knowledge.generate')`),
  }),
);
