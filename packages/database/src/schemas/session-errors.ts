import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sessionHistory } from "./session-history";

export const errorDimensionValues = ["lexical", "syntactic", "pragmatic", "discourse", "phonological"] as const;

export const sessionErrors = sqliteTable(
  "session_errors",
  {
    id: text("id").primaryKey(),
    sessionHistoryId: text("session_history_id")
      .notNull()
      .references(() => sessionHistory.id, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    errorDescription: text("error_description").notNull(),
    utterance: text("utterance").notNull(),
    suggestion: text("suggestion").notNull(),
  },
  (table) => [
    index("session_errors_session_history_id_idx").on(table.sessionHistoryId),
    check(
      "session_errors_dimension_check",
      sql`${table.dimension} in ('lexical', 'syntactic', 'pragmatic', 'discourse', 'phonological')`,
    ),
  ],
);
