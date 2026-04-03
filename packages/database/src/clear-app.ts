import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const defaultDatabasePath = fileURLToPath(new URL("../../../data/coach.sqlite", import.meta.url));
const databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath;

mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);

sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA busy_timeout = 5000;");
sqlite.exec("PRAGMA foreign_keys = ON;");

sqlite.transaction(() => {
  sqlite.query("delete from submission_jobs").run();
  sqlite.query("delete from submissions").run();
})();

sqlite.close();

console.log(`Cleared application data tables at ${databasePath} while preserving auth data`);
