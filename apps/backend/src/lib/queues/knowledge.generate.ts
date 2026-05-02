import {
  type KnowledgeGenerateJobUpdate,
  type KnowledgeGenerateSubmissionItem,
  knowledgeGenerateProgressChannel as knowledgeGenerateDefaultProgressChannel,
  knowledgeGenerateJobName,
  knowledgeGenerateJobUpdateSchema,
  knowledgeGenerateQueueName,
  knowledgeGenerateSubmissionKind,
} from "@english-coach/contract/knowledge";

import { type Job, Queue, Worker } from "bullmq";
import { type GeneratedKnowledgeItem, getProvider, modelConfig } from "../ai";
import { defaultProviderId } from "../env";
import { producerRedis, pubsubPublisherRedis, workerRedis } from "../redis";
import { persistGeneratedKnowledgeItem } from "./helpers/knowledge-items.persistence";
import {
  createCompletedProgressMessage,
  createFailedProgressMessage,
  createQueuedProgressMessage,
  createStartedProgressMessage,
  type JobProgressMessage,
  publishJobProgress,
} from "./helpers/progress";
import {
  createSubmissionProgressMessage,
  createSubmissionRecord,
  getSubmissionProgressSnapshots,
  type SubmissionProgressMessage,
  saveSubmissionProgressSnapshot,
} from "./helpers/submission-progress";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

export const knowledgeGenerateProgressChannel =
  process.env.KNOWLEDGE_GENERATE_PROGRESS_CHANNEL ?? knowledgeGenerateDefaultProgressChannel;

export type KnowledgeGenerateJobData = KnowledgeGenerateSubmissionItem & {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type KnowledgeGenerateProgressMessage = KnowledgeGenerateJobUpdate;

export const knowledgeGenerateQueue = new Queue<KnowledgeGenerateJobData>(knowledgeGenerateQueueName, {
  connection: producerRedis,
});

const knowledgeItemAi = getProvider(defaultProviderId).knowledgeItem;
const models = modelConfig[defaultProviderId];

let knowledgeGeneratorOverride: ((prompt: string) => Promise<GeneratedKnowledgeItem>) | null = null;

export function publishKnowledgeGenerateProgress(message: KnowledgeGenerateProgressMessage) {
  return publishJobProgress(pubsubPublisherRedis, knowledgeGenerateProgressChannel, message);
}

function createKnowledgeGenerateProgressMessage(
  baseMessage: JobProgressMessage,
  jobData: Pick<KnowledgeGenerateJobData, "cursor" | "submissionId">,
) {
  return createSubmissionProgressMessage({
    baseMessage,
    jobData,
    kind: knowledgeGenerateSubmissionKind,
    schema: knowledgeGenerateJobUpdateSchema,
  });
}

function createQueuedKnowledgeGenerateProgressMessage(jobId: string, jobData: KnowledgeGenerateJobData) {
  return createKnowledgeGenerateProgressMessage(
    createQueuedProgressMessage(jobId, jobData.queuedAt, "Knowledge item queued"),
    jobData,
  );
}

function createStartedKnowledgeGenerateProgressMessage(jobId: string, jobData: KnowledgeGenerateJobData) {
  return createKnowledgeGenerateProgressMessage(
    createStartedProgressMessage(jobId, jobData.queuedAt, "Knowledge item generation started"),
    jobData,
  );
}

function createCompletedKnowledgeGenerateProgressMessage(
  jobId: string,
  jobData: KnowledgeGenerateJobData,
  processedAt: string,
  pattern: string,
) {
  return createKnowledgeGenerateProgressMessage(
    createCompletedProgressMessage(jobId, processedAt, `Knowledge item ready for review: ${pattern}`),
    jobData,
  );
}

function createFailedKnowledgeGenerateProgressMessage(jobId: string, jobData: KnowledgeGenerateJobData, error: string) {
  return createKnowledgeGenerateProgressMessage(
    createFailedProgressMessage(jobId, error, "Knowledge item generation failed"),
    jobData,
  );
}

export async function createKnowledgeGenerateSubmission(
  submissionId: string,
  totalCount: number,
  userId?: string | null,
) {
  await createSubmissionRecord({
    kind: knowledgeGenerateSubmissionKind,
    totalCount,
    submissionId,
    userId,
  });
}

async function saveKnowledgeGenerateSnapshot(message: KnowledgeGenerateProgressMessage) {
  await saveSubmissionProgressSnapshot(message as SubmissionProgressMessage);
}

export async function getKnowledgeGenerateSnapshots({
  cursor,
  limit,
  submissionId,
}: {
  cursor?: number;
  limit: number;
  submissionId: string;
}): Promise<KnowledgeGenerateProgressMessage[]> {
  return getSubmissionProgressSnapshots({
    cursor,
    limit,
    schema: knowledgeGenerateJobUpdateSchema,
    submissionId,
  });
}

async function generateKnowledgeItem(prompt: string): Promise<GeneratedKnowledgeItem> {
  if (knowledgeGeneratorOverride) {
    return knowledgeGeneratorOverride(prompt);
  }

  return knowledgeItemAi.generateKnowledgeItem(models.KNOWLEDGE_GENERATE_MODEL, {
    input: prompt,
  });
}

export function setKnowledgeGeneratorForTests(generator: ((prompt: string) => Promise<GeneratedKnowledgeItem>) | null) {
  knowledgeGeneratorOverride = generator;
}

async function handleKnowledgeGenerateJob(job: Job<KnowledgeGenerateJobData>) {
  // Step 1: publish started job progress
  const startedMessage = createStartedKnowledgeGenerateProgressMessage(String(job.id), job.data);
  await saveKnowledgeGenerateSnapshot(startedMessage);
  await publishKnowledgeGenerateProgress(startedMessage);

  // Step 2: generate the knowledge item
  const generatedKnowledgeItem = await generateKnowledgeItem(job.data.message);
  const persistedKnowledgeItem = await persistGeneratedKnowledgeItem(generatedKnowledgeItem);

  // Step 3: publish completion progress
  const completedMessage = createCompletedKnowledgeGenerateProgressMessage(
    String(job.id),
    job.data,
    persistedKnowledgeItem.processedAt,
    persistedKnowledgeItem.pattern,
  );
  await saveKnowledgeGenerateSnapshot(completedMessage);
  await publishKnowledgeGenerateProgress(completedMessage);

  return persistedKnowledgeItem;
}

export const knowledgeGenerateWorker = new Worker<KnowledgeGenerateJobData>(
  knowledgeGenerateQueueName,
  handleKnowledgeGenerateJob,
  {
    connection: workerRedis,
  },
);

knowledgeGenerateWorker.on("completed", (job) => {
  logWorkerCompleted(knowledgeGenerateJobName, job);
});

knowledgeGenerateWorker.on("failed", async (job, error) => {
  if (job) {
    const failedMessage = createFailedKnowledgeGenerateProgressMessage(String(job.id), job.data, error.message);
    await saveKnowledgeGenerateSnapshot(failedMessage);
    await publishKnowledgeGenerateProgress(failedMessage);
  }

  logWorkerFailed(knowledgeGenerateJobName, job, error);
});

export async function persistQueuedKnowledgeGenerateJob(jobId: string, jobData: KnowledgeGenerateJobData) {
  const queuedMessage = createQueuedKnowledgeGenerateProgressMessage(jobId, jobData);

  await saveKnowledgeGenerateSnapshot(queuedMessage);
  await publishKnowledgeGenerateProgress(queuedMessage);

  return queuedMessage;
}
