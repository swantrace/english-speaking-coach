import {
  lingAnalysisJobName,
  type SessionCompletionJob,
  sessionCompletionJobName,
  sessionCompletionQueueName,
  sessionCompletionRequestSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionHistory } from "@english-coach/database/schema";
import { type Job, Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { producerRedis, workerRedis } from "../redis";
import { persistTranscriptBatchForSession } from "./helpers/session-transcripts.persistence";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";
import { lingAnalysisQueue } from "./ling.analysis";

export const sessionCompletionQueue = new Queue<SessionCompletionJob>(sessionCompletionQueueName, {
  connection: producerRedis,
});

async function readSessionForCompletion(sessionHistoryId: string) {
  const [existingSession] = await db
    .select({ id: sessionHistory.id, completedGoals: sessionHistory.completedGoals })
    .from(sessionHistory)
    .where(eq(sessionHistory.id, sessionHistoryId))
    .limit(1);

  if (!existingSession) {
    throw new Error(`Session not found for completion ${sessionHistoryId}`);
  }

  return existingSession;
}

async function markSessionCompleted({
  completedGoals,
  existingCompletedGoals,
  sessionHistoryId,
}: {
  completedGoals?: string[];
  existingCompletedGoals: string[] | null;
  sessionHistoryId: string;
}) {
  await db
    .update(sessionHistory)
    .set({
      completedGoals: completedGoals ?? existingCompletedGoals ?? [],
      endedAt: new Date().toISOString(),
    })
    .where(eq(sessionHistory.id, sessionHistoryId));
}

async function enqueueLingAnalysis(sessionHistoryId: string) {
  await lingAnalysisQueue.add(
    lingAnalysisJobName,
    { sessionHistoryId },
    {
      jobId: `${lingAnalysisJobName}-${sessionHistoryId}`,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

async function handleSessionCompletionJob(job: Job<SessionCompletionJob>) {
  // Step 1: validate job payload
  const parsedJob = sessionCompletionRequestSchema.parse(job.data);

  // Step 2: ensure the session exists before writing completion state
  const existingSession = await readSessionForCompletion(parsedJob.sessionHistoryId);

  // Step 3: persist the final transcript batch
  await persistTranscriptBatchForSession(parsedJob.sessionHistoryId, parsedJob.transcript);

  // Step 4: mark the session as completed
  await markSessionCompleted({
    completedGoals: parsedJob.completedGoals,
    existingCompletedGoals: existingSession.completedGoals,
    sessionHistoryId: parsedJob.sessionHistoryId,
  });

  // Step 5: enqueue post-session linguistic analysis
  await enqueueLingAnalysis(parsedJob.sessionHistoryId);

  return { status: "accepted" } as const;
}

export const sessionCompletionWorker = new Worker<SessionCompletionJob>(
  sessionCompletionQueueName,
  handleSessionCompletionJob,
  {
    connection: workerRedis,
  },
);

sessionCompletionWorker.on("completed", (job) => {
  logWorkerCompleted(sessionCompletionJobName, job);
});

sessionCompletionWorker.on("failed", (job, error) => {
  logWorkerFailed(sessionCompletionJobName, job, error);
});
