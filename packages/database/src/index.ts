import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
  await databaseClient.batch(
    ["PRAGMA journal_mode = WAL", "PRAGMA busy_timeout = 5000", "PRAGMA foreign_keys = ON"],
    "write",
  );
}

export const db = drizzle({ client: databaseClient, schema });

export const { submissionJobs, submissions } = schema;

let migrationPromise: Promise<void> | undefined;

export async function migrateDatabase() {
  migrationPromise ??= migrate(db, { migrationsFolder });
  await migrationPromise;
}
