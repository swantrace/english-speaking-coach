import { db, jobRuns, migrateDatabase } from "@english-coach/database";
import { Worker } from "bullmq";

import { connection, type ExampleJobData, exampleQueueName } from "./lib/queue";

migrateDatabase();

const worker = new Worker<ExampleJobData>(
  exampleQueueName,
  async (job) => {
    const processedAt = new Date().toISOString();

    await db.insert(jobRuns).values({
      jobId: String(job.id),
      message: job.data.message,
      processedAt,
    });

    console.log(`processed job ${job.id}: ${job.data.message}`);

    return { processedAt };
  },
  {
    connection,
  },
);

worker.on("completed", (job) => {
  console.log(`job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`job ${job?.id ?? "unknown"} failed`, error);
});

console.log("backend worker listening for jobs on queue 'example'");
