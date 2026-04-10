import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sessionHistory } from "./session-history";

export const sessionTranscripts = sqliteTable("session_transcripts", {
  id: text("id").primaryKey(),
  /** 1:1 with session_history. Separated so list queries stay lightweight. */
  sessionHistoryId: text("session_history_id")
    .notNull()
    .unique()
    .references(() => sessionHistory.id, { onDelete: "cascade" }),
  /** Array<{ speaker: "user" | "assistant", text: string, timestampMs: number }> */
  turns: text("turns", { mode: "json" })
    .notNull()
    .$type<Array<{ speaker: "user" | "assistant"; text: string; timestampMs: number }>>(),
  /** Array<{ id, kind, text, transcriptTurnIndex, coachingKind?, source? }> */
  annotations: text("annotations", { mode: "json" }).$type<
    Array<{
      coachingKind?: "error_hint" | "knowledge_hint" | "fluency_hint";
      id: string;
      kind: "goal-progress" | "coaching";
      source?: "role-play-live" | "free-form-live" | "post-session-review";
      text: string;
      transcriptTurnIndex: number;
    }>
  >(),
  /** Array<{ transcriptTurnIndex, text }> for rewritten learner turns. */
  rewrittenTurns: text("rewritten_turns", { mode: "json" }).$type<
    Array<{ text: string; transcriptTurnIndex: number }>
  >(),
  createdAt: text("created_at").notNull(),
});
