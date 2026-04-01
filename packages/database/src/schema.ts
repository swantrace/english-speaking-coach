import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobRuns = sqliteTable("job_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: text("job_id").notNull(),
  message: text("message").notNull(),
  processedAt: text("processed_at").notNull(),
});