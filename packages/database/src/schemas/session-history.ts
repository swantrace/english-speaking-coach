import { sessionTypeValues } from "@english-coach/domain";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { freeFormContexts } from "./free-form-contexts";
import { scenarios } from "./scenarios";

const sessionTypeValuesSql = sql.raw(sessionTypeValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "));

export const sessionHistory = sqliteTable(
  "session_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    sessionType: text("session_type", { enum: sessionTypeValues }).notNull(),
    startedAt: text("started_at").notNull(),
    endedAt: text("ended_at"),
    /** LLM-generated markdown review; null until the lingAnalysis worker completes. */
    review: text("review"),
    summary: text("summary", { mode: "json" }).$type<{
      strengths?: string[];
      opportunities?: string[];
      overallComment?: string;
    }>(),

    // ── role-play only (null for free-form) ──────────────────────────────────
    scenarioId: text("scenario_id").references(() => scenarios.id),
    /** Index of the character the user selected (0 or 1). */
    selectedCharacterIndex: integer("selected_character_index"),
    /** string[] of completed goal ids. */
    completedGoals: text("completed_goals", { mode: "json" }).$type<string[]>(),

    // ── free-form only (null for role-play) ──────────────────────────────────
    freeFormContextId: text("free_form_context_id").references(() => freeFormContexts.id),
  },
  (table) => [
    index("session_history_started_at_idx").on(table.startedAt),
    index("session_history_user_id_idx").on(table.userId),
    index("session_history_user_started_at_idx").on(table.userId, table.startedAt),
    index("session_history_scenario_id_idx").on(table.scenarioId),
    index("session_history_free_form_context_id_idx").on(table.freeFormContextId),
    index("session_history_session_type_idx").on(table.sessionType),
    check("session_history_session_type_check", sql`${table.sessionType} in (${sessionTypeValuesSql})`),
    check(
      "session_history_role_play_scenario_required_check",
      sql`${table.sessionType} != 'role-play' OR ${table.scenarioId} IS NOT NULL`,
    ),
    check(
      "session_history_free_form_context_required_check",
      sql`${table.sessionType} != 'free-form' OR ${table.freeFormContextId} IS NOT NULL`,
    ),
    check(
      "session_history_role_play_selected_character_check",
      sql`${table.sessionType} != 'role-play' OR (${table.selectedCharacterIndex} IS NOT NULL AND ${table.selectedCharacterIndex} in (0, 1))`,
    ),
    check(
      "session_history_free_form_selected_character_null_check",
      sql`${table.sessionType} != 'free-form' OR ${table.selectedCharacterIndex} IS NULL`,
    ),
    check(
      "session_history_role_play_free_form_context_null_check",
      sql`${table.sessionType} != 'role-play' OR ${table.freeFormContextId} IS NULL`,
    ),
    check(
      "session_history_free_form_scenario_null_check",
      sql`${table.sessionType} != 'free-form' OR ${table.scenarioId} IS NULL`,
    ),
  ],
);
