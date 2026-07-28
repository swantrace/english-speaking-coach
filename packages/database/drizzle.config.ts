import "dotenv/config";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    authToken: process.env.TURSO_AUTH_TOKEN,
    url:
      process.env.TURSO_DATABASE_URL ??
      (process.env.DATABASE_PATH ? `file:${process.env.DATABASE_PATH}` : "file:../../data/coach.sqlite"),
  },
  dialect: "turso",
  out: "./drizzle",
  schema: "./src/schema.ts",
});
