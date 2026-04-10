import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import * as schema from "./schema";

const defaultDatabasePath = fileURLToPath(
  new URL(
    process.env.NODE_ENV === "test" ? "../../../data/coach.test.sqlite" : "../../../data/coach.sqlite",
    import.meta.url,
  ),
);
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

export const databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath;

mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath);

sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA busy_timeout = 5000;");

export const db = drizzle({ client: sqlite, schema });

export const { submissionJobs, submissions } = schema;

let migrated = false;

export function migrateDatabase() {
  if (migrated) {
    return;
  }

  migrate(db, { migrationsFolder });
  migrated = true;
}
