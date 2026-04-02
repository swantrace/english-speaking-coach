import "dotenv/config";

import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const defaultDatabasePath = fileURLToPath(new URL("../../data/coach.sqlite", import.meta.url));

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? defaultDatabasePath,
  },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/schema.ts",
});
