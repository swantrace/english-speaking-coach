import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Stores free-form context documents separately to keep session_history list queries lightweight. */
export const freeFormContexts = sqliteTable("free_form_contexts", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull(),
});
