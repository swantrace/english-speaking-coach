import {
  lingAnalysisJobName,
  type SessionCompletionJob,
  sessionCompletionJobName,
  sessionCompletionQueueName,
  sessionCompletionRequestSchema,
} from "@english-coach/contract/session";
import { type Job, Queue, Worker } from "bullmq";
import { producerRedis, workerRedis } from "../redis";
import { persistSessionCompletion } from "./helpers/session-completion.persistence";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";
import { lingAnalysisQueue } from "./ling.analysis";

export const sessionCompletionQueue = new Queue<SessionCompletionJob>(sessionCompletionQueueName, {
  connection: producerRedis,
});

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

  // Step 2: persist the final transcript and mark the session completed
  await persistSessionCompletion({
    completedGoals: parsedJob.completedGoals,
    sessionHistoryId: parsedJob.sessionHistoryId,
    transcript: parsedJob.transcript,
  });

  // Step 3: enqueue post-session linguistic analysis
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
