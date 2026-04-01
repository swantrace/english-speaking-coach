import { db, migrateDatabase } from "@english-coach/database";
import { Hono } from "hono";

import { type ExampleJobData, exampleQueue } from "./lib/queue";

migrateDatabase();

const app = new Hono();
const port = Number(process.env.PORT ?? 3001);

app.get("/health", (context) => {
  return context.json({
    databasePath: db.$client.filename,
    queue: "ok",
    service: "backend-api",
    status: "ok",
  });
});

app.post("/jobs/example", async (context) => {
  const body = await context.req
    .json<Partial<ExampleJobData>>()
    .catch(() => ({ message: undefined, queuedAt: undefined }));

  const payload: ExampleJobData = {
    message: body.message ?? "hello from the api",
    queuedAt: body.queuedAt ?? new Date().toISOString(),
  };

  const job = await exampleQueue.add("example", payload);

  return context.json(
    {
      id: job.id,
      payload,
      queued: true,
    },
    202,
  );
});

console.log(`backend api listening on http://localhost:${port}`);

export default {
  fetch: app.fetch,
  port,
};
