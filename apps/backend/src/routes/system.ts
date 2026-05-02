import { knowledgeGenerateQueueName } from "@english-coach/contract/knowledge";
import { scenarioGenerateQueueName } from "@english-coach/contract/scenario";
import { databasePath } from "@english-coach/database";
import type { BackendApp } from "../http/context";

export function registerSystemRoutes(app: BackendApp) {
  // Report basic service health and queue configuration.
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
