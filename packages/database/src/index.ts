import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { assertSafeDatabaseConfiguration, databaseAuthToken, databaseUrl } from "./config";
import * as schema from "./schema";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

assertSafeDatabaseConfiguration();

if (databaseUrl.startsWith("file:")) {
  mkdirSync(dirname(fileURLToPath(databaseUrl)), { recursive: true });
}

export const databaseClient = createClient({
  authToken: databaseAuthToken,
  url: databaseUrl,
});

if (databaseUrl.startsWith("file:")) {
  // journal_mode cannot be changed from inside the transaction created by a
  // write batch. Apply connection-level SQLite pragmas individually instead.
  await databaseClient.execute("PRAGMA journal_mode = WAL");
  await databaseClient.execute("PRAGMA busy_timeout = 5000");
  await databaseClient.execute("PRAGMA foreign_keys = ON");
}

export const db = drizzle({ client: databaseClient, schema });

export const { submissionJobs, submissions } = schema;

let migrationPromise: Promise<void> | undefined;

export async function migrateDatabase() {
  migrationPromise ??= migrate(db, { migrationsFolder });
  await migrationPromise;
}
