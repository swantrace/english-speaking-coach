import {
  type ScenarioGenerateJobUpdate,
  type ScenarioGenerateSubmissionItem,
  scenarioGenerateProgressChannel as scenarioGenerateDefaultProgressChannel,
  scenarioGenerateJobName,
  scenarioGenerateJobUpdateSchema,
  scenarioGenerateQueueName,
  scenarioGenerateSubmissionKind,
} from "@english-coach/contract/scenario";

import { db } from "@english-coach/database";
import { scenarios } from "@english-coach/database/schema";
import { type Job, Queue, Worker } from "bullmq";
import { type GeneratedScenario, getProvider, modelConfig } from "../ai";
import { defaultProviderId } from "../env";
import { producerRedis, pubsubPublisherRedis, workerRedis } from "../redis";
import { type JobProgressBaseMessage, publishJobProgress } from "./helpers/progress";
import {
  createSubmissionProgressMessage,
  createSubmissionRecord,
  getSubmissionProgressSnapshots,
  type SubmissionProgressMessage,
  saveSubmissionProgressSnapshot,
} from "./helpers/submission-progress";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

export const scenarioGenerateProgressChannel =
  process.env.SCENARIO_GENERATE_PROGRESS_CHANNEL ?? scenarioGenerateDefaultProgressChannel;

export type ScenarioGenerateJobData = ScenarioGenerateSubmissionItem & {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type ScenarioGenerateProgressMessage = ScenarioGenerateJobUpdate;

export const scenarioGenerateQueue = new Queue<ScenarioGenerateJobData>(scenarioGenerateQueueName, {
  connection: producerRedis,
});

const scenarioAi = getProvider(defaultProviderId).scenario;
const models = modelConfig[defaultProviderId];

let scenarioGeneratorOverride: ((prompt: string) => Promise<GeneratedScenario>) | null = null;

export function publishScenarioGenerateProgress(message: ScenarioGenerateProgressMessage) {
  return publishJobProgress(pubsubPublisherRedis, scenarioGenerateProgressChannel, message);
}

function createScenarioGenerateProgressMessage(
  jobId: string,
  jobData: Pick<ScenarioGenerateJobData, "cursor" | "submissionId">,
  progress: Omit<JobProgressBaseMessage, "jobId">,
) {
  return createSubmissionProgressMessage({
    jobData,
    kind: scenarioGenerateSubmissionKind,
    progress: {
      jobId,
      ...progress,
    },
    schema: scenarioGenerateJobUpdateSchema,
  });
}

export async function createScenarioGenerateSubmission(
  submissionId: string,
  totalCount: number,
  userId?: string | null,
) {
  await createSubmissionRecord({
    kind: scenarioGenerateSubmissionKind,
    totalCount,
    submissionId,
    userId,
  });
}

async function saveScenarioGenerateSnapshot(message: ScenarioGenerateProgressMessage) {
  await saveSubmissionProgressSnapshot(message as SubmissionProgressMessage);
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
  return getSubmissionProgressSnapshots({
    cursor,
    limit,
    schema: scenarioGenerateJobUpdateSchema,
    submissionId,
  });
}

async function generateScenario(prompt: string): Promise<GeneratedScenario> {
  if (scenarioGeneratorOverride) {
    return scenarioGeneratorOverride(prompt);
  }

  return scenarioAi.generateScenario(models.SCENARIO_GENERATE_MODEL, {
    brief: prompt,
  });
}

async function persistScenario(generatedScenario: GeneratedScenario) {
  const now = new Date().toISOString();
  const scenarioId = crypto.randomUUID();

  if (generatedScenario.characters.length !== 2) {
    throw new Error("Generated scenario must contain exactly two characters");
  }

  await db.insert(scenarios).values({
    characters: [generatedScenario.characters[0], generatedScenario.characters[1]],
    createdAt: now,
    exampleDialogue: generatedScenario.exampleDialogue,
    goals: generatedScenario.goals,
    id: scenarioId,
    isPendingReview: true,
    setting: generatedScenario.setting,
    title: generatedScenario.title,
    updatedAt: now,
  });

  return {
    processedAt: now,
    scenarioId,
    title: generatedScenario.title,
  };
}

async function handleScenarioGenerateJob(job: Job<ScenarioGenerateJobData>) {
  const startedMessage = createScenarioGenerateProgressMessage(String(job.id), job.data, {
    message: "Scenario generation started",
    progress: 10,
    queuedAt: job.data.queuedAt,
    status: "started",
  });
  await saveScenarioGenerateSnapshot(startedMessage);
  await publishScenarioGenerateProgress(startedMessage);

  const generatedScenario = await generateScenario(job.data.message);
  const persistedScenario = await persistScenario(generatedScenario);

  const completedMessage = createScenarioGenerateProgressMessage(String(job.id), job.data, {
    message: "completed",
    processedAt: persistedScenario.processedAt,
    progress: 100,
    status: "completed",
  });
  await saveScenarioGenerateSnapshot(completedMessage);
  await publishScenarioGenerateProgress(completedMessage);

  return persistedScenario;
}

export const scenarioGenerateWorker = new Worker<ScenarioGenerateJobData>(
  scenarioGenerateQueueName,
  handleScenarioGenerateJob,
  {
    connection: workerRedis,
  },
);

scenarioGenerateWorker.on("completed", (job) => {
  logWorkerCompleted(scenarioGenerateJobName, job);
});

scenarioGenerateWorker.on("failed", async (job, error) => {
  if (job) {
    const failedMessage = createScenarioGenerateProgressMessage(String(job.id), job.data, {
      error: error.message,
      message: "failed",
      progress: 100,
      status: "failed",
    });
    await saveScenarioGenerateSnapshot(failedMessage);
    await publishScenarioGenerateProgress(failedMessage);
  }

  logWorkerFailed(scenarioGenerateJobName, job, error);
});

export function setScenarioGeneratorForTests(generator: ((prompt: string) => Promise<GeneratedScenario>) | null) {
  scenarioGeneratorOverride = generator;
}

export async function persistQueuedScenarioGenerateJob(jobId: string, jobData: ScenarioGenerateJobData) {
  const queuedMessage = createScenarioGenerateProgressMessage(jobId, jobData, {
    message: "Scenario queued",
    progress: 0,
    queuedAt: jobData.queuedAt,
    status: "queued",
  });

  await saveScenarioGenerateSnapshot(queuedMessage);
  await publishScenarioGenerateProgress(queuedMessage);

  return queuedMessage;
}
