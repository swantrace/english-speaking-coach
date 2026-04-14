import { errorDimensionValues } from "@english-coach/domain";
import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sessionHistory } from "./session-history";

const errorDimensionValuesSql = sql.raw(
  errorDimensionValues.map((value) => `'${value.replaceAll("'", "''")}'`).join(", "),
);

export const sessionErrors = sqliteTable(
  "session_errors",
  {
    id: text("id").primaryKey(),
    sessionHistoryId: text("session_history_id")
      .notNull()
      .references(() => sessionHistory.id, { onDelete: "cascade" }),
    dimension: text("dimension", { enum: errorDimensionValues }).notNull(),
    errorDescription: text("error_description").notNull(),
    utterance: text("utterance").notNull(),
    suggestion: text("suggestion").notNull(),
  },
  (table) => [
    index("session_errors_session_history_id_idx").on(table.sessionHistoryId),
    check("session_errors_dimension_check", sql`${table.dimension} in (${errorDimensionValuesSql})`),
  ],
);
