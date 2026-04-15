import {
  lingAnalysisJobName,
  type SessionCompletionJob,
  sessionCompletionJobName,
  sessionCompletionQueueName,
  sessionCompletionRequestSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionHistory } from "@english-coach/database/schema";
import { Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";

import { producerRedis, workerRedis } from "../redis";
import { persistTranscriptBatchForSession } from "./in-conversation.analysis";
import { lingAnalysisQueue } from "./ling.analysis";

export const sessionCompletionQueue = new Queue<SessionCompletionJob>(sessionCompletionQueueName, {
  connection: producerRedis,
});

export async function completeSession(job: SessionCompletionJob) {
  const parsedJob = sessionCompletionRequestSchema.parse(job);
  const [existingSession] = await db
    .select({ id: sessionHistory.id, completedGoals: sessionHistory.completedGoals })
    .from(sessionHistory)
    .where(eq(sessionHistory.id, parsedJob.sessionHistoryId))
    .limit(1);

  if (!existingSession) {
    throw new Error(`Session not found for completion ${parsedJob.sessionHistoryId}`);
  }

  await persistTranscriptBatchForSession(parsedJob.sessionHistoryId, parsedJob.transcript);

  await db
    .update(sessionHistory)
    .set({
      completedGoals: parsedJob.completedGoals ?? existingSession.completedGoals ?? [],
      endedAt: new Date().toISOString(),
    })
    .where(eq(sessionHistory.id, parsedJob.sessionHistoryId));

  await lingAnalysisQueue.add(
    lingAnalysisJobName,
    { sessionHistoryId: parsedJob.sessionHistoryId },
    {
      jobId: `${lingAnalysisJobName}-${parsedJob.sessionHistoryId}`,
      removeOnComplete: true,
    },
  );

  return { status: "accepted" } as const;
}

export const sessionCompletionWorker = new Worker<SessionCompletionJob>(
  sessionCompletionQueueName,
  async (job) => completeSession(job.data),
  {
    connection: workerRedis,
  },
);

sessionCompletionWorker.on("completed", (job) => {
  console.log(`${sessionCompletionJobName} job ${job.id} completed`);
});

sessionCompletionWorker.on("failed", (job, error) => {
  console.error(`${sessionCompletionJobName} job ${job?.id ?? "unknown"} failed`, error);
});
