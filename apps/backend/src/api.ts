import { migrateDatabase } from "@english-coach/database";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppVariables } from "./http/context";
import { attachRequestSession, registerAccessPolicies } from "./http/guards";
import { authTrustedOrigins } from "./lib/auth/options";
import { knowledgeGenerateWorker } from "./lib/queues/knowledge.generate";
import { knowledgeOccurrenceResolveWorker } from "./lib/queues/knowledge-occurrence.resolve";
import { scenarioGenerateWorker } from "./lib/queues/scenario.generate";
import { registerRoutes } from "./routes";

migrateDatabase();
void knowledgeGenerateWorker;
void knowledgeOccurrenceResolveWorker;
void scenarioGenerateWorker;

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

console.log(`backend api listening on http://localhost:${port}`);

export default {
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
};
