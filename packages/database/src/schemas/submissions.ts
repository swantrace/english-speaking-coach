import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const submissionKindValues = ["scenario.generate"] as const;

export const submissions = sqliteTable(
  "submissions",
  {
    createdAt: text("created_at").notNull(),
    id: text("id").primaryKey(),
    kind: text("kind", { enum: submissionKindValues }).notNull(),
    totalCount: integer("total_count").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    kindIdx: index("submissions_kind_idx").on(table.kind),
    kindCheck: check("submissions_kind_check", sql`${table.kind} in ('scenario.generate')`),
  }),
);
