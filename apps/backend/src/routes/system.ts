import { databasePath } from "@english-coach/database";
import type { BackendApp } from "../http/context";
import { scenarioGenerateQueueName } from "../lib/queues/scenario.generate";

export function registerSystemRoutes(app: BackendApp) {
  app.get("/health", (context) => {
    return context.json({
      auth: "ok",
      databasePath,
      queue: scenarioGenerateQueueName,
      service: "backend-api",
      status: "ok",
    });
  });
}
