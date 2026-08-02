import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sessionHistory } from "./session-history";

export const sessionProcessingStatusValues = ["not_applicable", "queued", "processing", "ready", "failed"] as const;

export type SessionProcessingStatus = (typeof sessionProcessingStatusValues)[number];

const sessionProcessingStatusValuesSql = sql.raw(
  sessionProcessingStatusValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "),
);

/**
 * Durable progress for asynchronous work that runs after a session ends.
 *
 * This is intentionally separate from session_history so history-list queries
 * remain lightweight and each stage can fail or be retried independently.
 */
export const sessionProcessing = sqliteTable(
  "session_processing",
  {
    sessionHistoryId: text("session_history_id")
      .primaryKey()
      .references(() => sessionHistory.id, { onDelete: "cascade" }),
    analysisStatus: text("analysis_status", { enum: sessionProcessingStatusValues }).notNull(),
    analysisError: text("analysis_error"),
    rewrittenTranscriptStatus: text("rewritten_transcript_status", { enum: sessionProcessingStatusValues }).notNull(),
    rewrittenTranscriptError: text("rewritten_transcript_error"),
    dialogueAudioStatus: text("dialogue_audio_status", { enum: sessionProcessingStatusValues }).notNull(),
    dialogueAudioError: text("dialogue_audio_error"),
    knowledgeStatus: text("knowledge_status", { enum: sessionProcessingStatusValues }).notNull(),
    knowledgeError: text("knowledge_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check(
      "session_processing_analysis_status_check",
      sql`${table.analysisStatus} in (${sessionProcessingStatusValuesSql})`,
    ),
    check(
      "session_processing_rewritten_transcript_status_check",
      sql`${table.rewrittenTranscriptStatus} in (${sessionProcessingStatusValuesSql})`,
    ),
    check(
      "session_processing_dialogue_audio_status_check",
      sql`${table.dialogueAudioStatus} in (${sessionProcessingStatusValuesSql})`,
    ),
    check(
      "session_processing_knowledge_status_check",
      sql`${table.knowledgeStatus} in (${sessionProcessingStatusValuesSql})`,
    ),
    index("session_processing_analysis_status_idx").on(table.analysisStatus),
    index("session_processing_rewritten_transcript_status_idx").on(table.rewrittenTranscriptStatus),
    index("session_processing_dialogue_audio_status_idx").on(table.dialogueAudioStatus),
    index("session_processing_knowledge_status_idx").on(table.knowledgeStatus),
  ],
);
