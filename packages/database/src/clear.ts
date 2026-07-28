import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertDestructiveDatabaseOperationAllowed, databaseUrl } from "./config";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
assertDestructiveDatabaseOperationAllowed();
const databasePath = fileURLToPath(databaseUrl);

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

console.log(`Cleared database and removed migrations at ${databasePath}`);
