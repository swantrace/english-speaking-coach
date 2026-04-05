import { databasePath } from "@english-coach/database";
import type { BackendApp } from "../http/context";
import { knowledgeGenerateQueueName } from "../lib/queues/knowledge.generate";
import { scenarioGenerateQueueName } from "../lib/queues/scenario.generate";

export function registerSystemRoutes(app: BackendApp) {
  app.get("/health", (context) => {
    return context.json({
      auth: "ok",
      databasePath,
      queues: [scenarioGenerateQueueName, knowledgeGenerateQueueName],
      service: "backend-api",
      status: "ok",
    });
  });
}
