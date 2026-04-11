import { Database } from "bun:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import * as schema from "./schema";

const defaultDatabasePath = fileURLToPath(new URL("../../../data/coach.sqlite", import.meta.url));
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath;

function removeIfExists(path: string) {
  rmSync(path, { force: true });
}

mkdirSync(dirname(databasePath), { recursive: true });

removeIfExists(databasePath);
removeIfExists(`${databasePath}-wal`);
removeIfExists(`${databasePath}-shm`);

const sqlite = new Database(databasePath);
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA busy_timeout = 5000;");

const db = drizzle({ client: sqlite, schema });

migrate(db, { migrationsFolder });
sqlite.close();

console.log(`Cleared database and re-applied migrations at ${databasePath}`);
