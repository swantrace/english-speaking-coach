import { fileURLToPath } from "node:url";

const defaultDatabasePath = fileURLToPath(
  new URL(
    process.env.NODE_ENV === "test" ? "../../../data/coach.test.sqlite" : "../../../data/coach.sqlite",
    import.meta.url,
  ),
);

export type AppEnvironment = "development" | "practice" | "test";

export const appEnvironment = (process.env.APP_ENV ??
  (process.env.NODE_ENV === "test" ? "test" : "development")) as AppEnvironment;

export const databaseUrl =
  process.env.TURSO_DATABASE_URL ??
  (process.env.DATABASE_PATH ? `file:${process.env.DATABASE_PATH}` : `file:${defaultDatabasePath}`);

export const databaseAuthToken = process.env.TURSO_AUTH_TOKEN || undefined;

export function assertSafeDatabaseConfiguration() {
  if (!["development", "practice", "test"].includes(appEnvironment)) {
    throw new Error(`Invalid APP_ENV "${appEnvironment}". Expected development, practice, or test.`);
  }

  if (appEnvironment === "practice" && databaseUrl.startsWith("file:")) {
    throw new Error("APP_ENV=practice requires a remote TURSO_DATABASE_URL.");
  }
}

export function assertDestructiveDatabaseOperationAllowed() {
  assertSafeDatabaseConfiguration();

  if (appEnvironment === "practice" || !databaseUrl.startsWith("file:")) {
    throw new Error("Destructive database commands are disabled for remote and practice databases.");
  }
}
