import { Database } from "bun:sqlite";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const defaultDatabasePath = fileURLToPath(new URL("../../../data/coach.sqlite", import.meta.url));
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath;

function removeIfExists(path: string) {
  rmSync(path, { force: true, recursive: true });
}

function clearMigrationsFolder(path: string) {
  const entries = readdirSync(path, { withFileTypes: true });

  for (const entry of entries) {
    removeIfExists(join(path, entry.name));
  }
}

mkdirSync(dirname(databasePath), { recursive: true });
mkdirSync(migrationsFolder, { recursive: true });

removeIfExists(databasePath);
removeIfExists(`${databasePath}-wal`);
removeIfExists(`${databasePath}-shm`);
clearMigrationsFolder(migrationsFolder);

const sqlite = new Database(databasePath);
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA busy_timeout = 5000;");
sqlite.close();

console.log(`Cleared database and removed migrations at ${databasePath}`);
