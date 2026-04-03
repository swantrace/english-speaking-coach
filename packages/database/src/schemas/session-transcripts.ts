import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sessionHistory } from "./session-history";

export const sessionTranscripts = sqliteTable("session_transcripts", {
  id: text("id").primaryKey(),
  /** 1:1 with session_history. Separated so list queries stay lightweight. */
  sessionHistoryId: text("session_history_id")
    .notNull()
    .unique()
    .references(() => sessionHistory.id, { onDelete: "cascade" }),
  /** Array<{ speaker: "user" | "agent", text: string, timestampMs: number }> */
  turns: text("turns", { mode: "json" })
    .notNull()
    .$type<Array<{ speaker: "user" | "agent"; text: string; timestampMs: number }>>(),
  createdAt: text("created_at").notNull(),
});
