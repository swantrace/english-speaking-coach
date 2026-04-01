import { Queue } from "bullmq";
import IORedis from "ioredis";

export const exampleQueueName = "example";

export interface ExampleJobData {
  message: string;
  queuedAt: string;
}

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const exampleQueue = new Queue<ExampleJobData>(exampleQueueName, {
  connection,
});