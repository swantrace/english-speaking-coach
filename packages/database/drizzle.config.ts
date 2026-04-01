import "dotenv/config";

import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "node:url";

const defaultDatabasePath = fileURLToPath(new URL("../../data/coach.sqlite", import.meta.url));

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? defaultDatabasePath,
  },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/schema.ts",
});