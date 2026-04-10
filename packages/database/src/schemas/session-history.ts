import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { freeFormContexts } from "./free-form-contexts";
import { scenarios } from "./scenarios";

export const sessionTypeValues = ["role-play", "free-form"] as const;

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
    index("session_history_user_id_idx").on(table.userId),
    check("session_history_session_type_check", sql`${table.sessionType} in (${sessionTypeValues.map((v) => `'${v}'`).join(", ")})`),
    check(
      "session_history_role_play_check",
      sql`${table.sessionType} != 'role-play' OR ${table.scenarioId} IS NOT NULL`,
    ),
    check(
      "session_history_free_form_check",
      sql`${table.sessionType} != 'free-form' OR ${table.freeFormContextId} IS NOT NULL`,
    ),
  ],
);
