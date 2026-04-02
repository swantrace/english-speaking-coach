import type {
  ScenarioGenerateJobUpdate,
  ScenarioGenerateSubmissionItem,
} from "@english-coach/contract/scenario-generate";
import {
  scenarioGenerateProgressChannel as scenarioGenerateDefaultProgressChannel,
  scenarioGenerateJobUpdateSchema,
  scenarioGenerateSubmissionKind,
  scenarioGenerateJobName as sharedScenarioGenerateJobName,
  scenarioGenerateQueueName as sharedScenarioGenerateQueueName,
} from "@english-coach/contract/scenario-generate";

export { scenarioGenerateUpdatedEvent } from "@english-coach/contract/scenario-generate";

import { db, migrateDatabase, sqlite, submissionJobs, submissions } from "@english-coach/database";
import { Queue, Worker } from "bullmq";
import { producerRedis, pubsubPublisherRedis, workerRedis } from "../redis";
import {
  createCompletedProgressMessage,
  createFailedProgressMessage,
  createQueuedProgressMessage,
  createStartedProgressMessage,
  type JobProgressMessage,
  publishJobProgress,
} from "./progress";

export const scenarioGenerateProgressChannel =
  process.env.SCENARIO_GENERATE_PROGRESS_CHANNEL ?? scenarioGenerateDefaultProgressChannel;

export type ScenarioGenerateJobData = ScenarioGenerateSubmissionItem & {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type ScenarioGenerateProgressMessage = ScenarioGenerateJobUpdate;

export const scenarioGenerateJobName = sharedScenarioGenerateJobName;
export const scenarioGenerateQueueName = sharedScenarioGenerateQueueName;

export const scenarioGenerateQueue = new Queue<ScenarioGenerateJobData>(scenarioGenerateQueueName, {
  connection: producerRedis,
});

export function publishScenarioGenerateProgress(message: ScenarioGenerateProgressMessage) {
  return publishJobProgress(pubsubPublisherRedis, scenarioGenerateProgressChannel, message);
}

function createScenarioGenerateProgressMessage(
  baseMessage: JobProgressMessage,
  jobData: Pick<ScenarioGenerateJobData, "cursor" | "submissionId">,
) {
  return scenarioGenerateJobUpdateSchema.parse({
    ...baseMessage,
    cursor: jobData.cursor,
    submissionId: jobData.submissionId,
  });
}

function createQueuedScenarioGenerateProgressMessage(jobId: string, jobData: ScenarioGenerateJobData) {
  return createScenarioGenerateProgressMessage(
    createQueuedProgressMessage(jobId, jobData.queuedAt, "Scenario queued"),
    jobData,
  );
}

function createStartedScenarioGenerateProgressMessage(jobId: string, jobData: ScenarioGenerateJobData) {
  return createScenarioGenerateProgressMessage(
    createStartedProgressMessage(jobId, jobData.queuedAt, "Scenario generation started"),
    jobData,
  );
}

function createCompletedScenarioGenerateProgressMessage(
  jobId: string,
  jobData: ScenarioGenerateJobData,
  processedAt: string,
) {
  return createScenarioGenerateProgressMessage(
    createCompletedProgressMessage(jobId, `Scenario ready: ${jobData.message}`, processedAt),
    jobData,
  );
}

function createFailedScenarioGenerateProgressMessage(jobId: string, jobData: ScenarioGenerateJobData, error: string) {
  return createScenarioGenerateProgressMessage(
    createFailedProgressMessage(jobId, error, "Scenario generation failed"),
    jobData,
  );
}

export async function createScenarioGenerateSubmission(submissionId: string, totalCount: number) {
  const now = new Date().toISOString();

  await db.insert(submissions).values({
    createdAt: now,
    id: submissionId,
    kind: scenarioGenerateSubmissionKind,
    totalCount,
    updatedAt: now,
  });
}

async function saveScenarioGenerateSnapshot(message: ScenarioGenerateProgressMessage) {
  const updatedAt = new Date().toISOString();

  await db
    .insert(submissionJobs)
    .values({
      cursor: message.cursor,
      error: message.error,
      jobId: message.jobId,
      message: message.message,
      processedAt: message.processedAt,
      progress: message.progress,
      queuedAt: message.queuedAt ?? new Date().toISOString(),
      status: message.status,
      submissionId: message.submissionId,
    })
    .onConflictDoUpdate({
      set: {
        error: message.error,
        message: message.message,
        processedAt: message.processedAt,
        progress: message.progress,
        queuedAt: message.queuedAt ?? new Date().toISOString(),
        status: message.status,
        submissionId: message.submissionId,
      },
      target: submissionJobs.jobId,
    });

  sqlite.query("update submissions set updated_at = ? where id = ?").run(updatedAt, message.submissionId);
}

export async function getScenarioGenerateSnapshots({
  cursor,
  limit,
  submissionId,
}: {
  cursor?: number;
  limit: number;
  submissionId: string;
}): Promise<ScenarioGenerateProgressMessage[]> {
  const query =
    typeof cursor === "number"
      ? sqlite.query(
          [
            "select cursor, error, job_id, message, processed_at, progress, queued_at, status, submission_id",
            "from submission_jobs",
            "where submission_id = ? and cursor > ?",
            "order by cursor asc",
            "limit ?",
          ].join(" "),
        )
      : sqlite.query(
          [
            "select cursor, error, job_id, message, processed_at, progress, queued_at, status, submission_id",
            "from submission_jobs",
            "where submission_id = ?",
            "order by cursor asc",
            "limit ?",
          ].join(" "),
        );

  const snapshots = (
    typeof cursor === "number" ? query.all(submissionId, cursor, limit) : query.all(submissionId, limit)
  ) as Array<{
    cursor: number;
    error: string | null;
    job_id: string;
    message: string;
    processed_at: string | null;
    progress: number;
    queued_at: string;
    status: string;
    submission_id: string;
  }>;

  return snapshots.map((snapshot) =>
    scenarioGenerateJobUpdateSchema.parse({
      cursor: snapshot.cursor,
      error: snapshot.error ?? undefined,
      jobId: snapshot.job_id,
      message: snapshot.message,
      processedAt: snapshot.processed_at ?? undefined,
      progress: snapshot.progress,
      queuedAt: snapshot.queued_at,
      status: snapshot.status,
      submissionId: snapshot.submission_id,
    }),
  );
}

migrateDatabase();

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const scenarioGenerateWorker = new Worker<ScenarioGenerateJobData>(
  scenarioGenerateQueueName,
  async (job) => {
    const startedMessage = createStartedScenarioGenerateProgressMessage(String(job.id), job.data);

    await saveScenarioGenerateSnapshot(startedMessage);
    await publishScenarioGenerateProgress(startedMessage);

    await delay(5000);

    if (job.data.shouldFail) {
      throw new Error("Scenario generation failed");
    }

    const processedAt = new Date().toISOString();

    const completedMessage = createCompletedScenarioGenerateProgressMessage(String(job.id), job.data, processedAt);

    await saveScenarioGenerateSnapshot(completedMessage);
    await publishScenarioGenerateProgress(completedMessage);

    return { processedAt };
  },
  {
    connection: workerRedis,
  },
);

scenarioGenerateWorker.on("completed", (job) => {
  console.log(`scenario.generate job ${job.id} completed`);
});

scenarioGenerateWorker.on("failed", async (job, error) => {
  if (job) {
    const failedMessage = createFailedScenarioGenerateProgressMessage(String(job.id), job.data, error.message);

    await saveScenarioGenerateSnapshot(failedMessage);
    await publishScenarioGenerateProgress(failedMessage);
  }

  console.error(`scenario.generate job ${job?.id ?? "unknown"} failed`, error);
});

export async function persistQueuedScenarioGenerateJob(jobId: string, jobData: ScenarioGenerateJobData) {
  const queuedMessage = createQueuedScenarioGenerateProgressMessage(jobId, jobData);

  await saveScenarioGenerateSnapshot(queuedMessage);
  await publishScenarioGenerateProgress(queuedMessage);

  return queuedMessage;
}
