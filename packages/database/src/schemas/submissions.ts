import { submissionKindValues } from "@english-coach/domain";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

const submissionKindValuesSql = sql.raw(
  submissionKindValues.map((value) => `'${value.replaceAll("'", "''")}'`).join(", "),
);

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
  (table) => [
    index("submissions_kind_idx").on(table.kind),
    check("submissions_kind_check", sql`${table.kind} in (${submissionKindValuesSql})`),
  ],
);
