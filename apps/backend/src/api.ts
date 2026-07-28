import { migrateDatabase } from "@english-coach/database";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppVariables } from "./http/context";
import { attachRequestSession, registerAccessPolicies } from "./http/guards";
import { authTrustedOrigins } from "./lib/auth";
import { registerRoutes } from "./routes";

if (process.env.MIGRATE_ON_STARTUP !== "false") {
  await migrateDatabase();
}

export const app = new Hono<{ Variables: AppVariables }>();
const port = Number(process.env.PORT ?? 3001);

app.use(
  "/api/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    origin: authTrustedOrigins,
  }),
);

app.use("*", attachRequestSession);
registerAccessPolicies(app);

registerRoutes(app);

if (import.meta.main) {
  const server = Bun.serve({
    fetch: app.fetch,
    idleTimeout: Number(process.env.BUN_IDLE_TIMEOUT_SECONDS ?? 60),
    port,
    hostname: "0.0.0.0",
  });

  console.log(`backend api listening on ${server.url}`);
}
