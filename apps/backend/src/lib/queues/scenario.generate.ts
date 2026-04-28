import { openai } from "@ai-sdk/openai";
import {
  type ScenarioGenerateJobUpdate,
  type ScenarioGenerateSubmissionItem,
  scenarioCharacterSchema,
  scenarioDialogueTurnSchema,
  scenarioGenerateProgressChannel as scenarioGenerateDefaultProgressChannel,
  scenarioGenerateJobUpdateSchema,
  scenarioGenerateSubmissionKind,
  scenarioGenerateUpdatedEvent,
  scenarioGoalsSchema,
  scenarioSchema,
  scenarioGenerateJobName as sharedScenarioGenerateJobName,
  scenarioGenerateQueueName as sharedScenarioGenerateQueueName,
} from "@english-coach/contract/scenario";

export { scenarioGenerateUpdatedEvent } from "@english-coach/contract/scenario";

import { db, migrateDatabase, sqlite } from "@english-coach/database";
import { scenarios, submissionJobs, submissions } from "@english-coach/database/schema";
import {
  buildScenarioExampleDialoguePrompt,
  buildScenarioGoalsGeneratePrompt,
  buildScenarioStoryGeneratePrompt,
} from "@english-coach/prompts";
import { generateText, Output } from "ai";
import { Queue, Worker } from "bullmq";
import { z } from "zod";
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

const generatedScenarioSchema = scenarioSchema
  .omit({
    createdAt: true,
    id: true,
    isPendingReview: true,
    updatedAt: true,
  })
  .extend({
    // OpenAI structured outputs reject tuple-style array schemas, so use a fixed-length
    // array here and normalize back to the persisted tuple shape after generation.
    characters: scenarioCharacterSchema.array().length(2),
  });

const scenarioStorySchema = z.object({
  characters: scenarioCharacterSchema.array().length(2),
  setting: z.string().trim().min(1),
  story: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

const scenarioDialogueExampleSchema = z.object({
  exampleDialogue: z.array(scenarioDialogueTurnSchema).min(1),
});

type GeneratedScenario = z.output<typeof generatedScenarioSchema>;
type ScenarioStory = z.infer<typeof scenarioStorySchema>;

let scenarioGeneratorOverride: ((prompt: string) => Promise<GeneratedScenario>) | null = null;

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
    createCompletedProgressMessage(jobId, processedAt, "completed"),
    jobData,
  );
}

function createFailedScenarioGenerateProgressMessage(jobId: string, jobData: ScenarioGenerateJobData, error: string) {
  return createScenarioGenerateProgressMessage(createFailedProgressMessage(jobId, error, "failed"), jobData);
}

export async function createScenarioGenerateSubmission(
  submissionId: string,
  totalCount: number,
  userId?: string | null,
) {
  const now = new Date().toISOString();

  await db.insert(submissions).values({
    createdAt: now,
    id: submissionId,
    kind: scenarioGenerateSubmissionKind,
    totalCount,
    updatedAt: now,
    userId: userId ?? null,
  });
}

async function saveScenarioGenerateSnapshot(message: ScenarioGenerateProgressMessage) {
  const updatedAt = new Date().toISOString();

  await db
    .insert(submissionJobs)
    .values({
      kind: message.kind,
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

async function generateScenario(prompt: string): Promise<GeneratedScenario> {
  if (scenarioGeneratorOverride) {
    return scenarioGeneratorOverride(prompt);
  }

  const scenarioStory = await generateScenarioStory(prompt);
  const goals = await generateScenarioGoals(scenarioStory);
  const exampleDialogue = await generateScenarioDialogue(scenarioStory, goals);

  return generatedScenarioSchema.parse({
    characters: scenarioStory.characters,
    exampleDialogue,
    goals,
    setting: scenarioStory.setting,
    title: scenarioStory.title,
  });
}

async function generateScenarioObject<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  promptParts: { prompt: string; system: string },
): Promise<z.output<TSchema>> {
  const { output } = await generateText({
    model: openai(process.env.SCENARIO_GENERATE_MODEL ?? "gpt-4.1-mini"),
    output: Output.object({
      schema,
    }),
    prompt: promptParts.prompt,
    system: promptParts.system,
    providerOptions: {
      openai: {
        strictJsonSchema: false,
      },
    },
  });

  return schema.parse(output);
}

async function generateScenarioStory(prompt: string): Promise<ScenarioStory> {
  return generateScenarioObject(scenarioStorySchema, buildScenarioStoryGeneratePrompt({ brief: prompt }));
}

async function generateScenarioGoals(story: ScenarioStory) {
  return generateScenarioObject(scenarioGoalsSchema, buildScenarioGoalsGeneratePrompt({ story }));
}

async function generateScenarioDialogue(story: ScenarioStory, goals: z.infer<typeof scenarioGoalsSchema>) {
  const result = await generateScenarioObject(
    scenarioDialogueExampleSchema,
    buildScenarioExampleDialoguePrompt({ goals, story }),
  );

  return result.exampleDialogue;
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

export function setScenarioGeneratorForTests(generator: ((prompt: string) => Promise<GeneratedScenario>) | null) {
  scenarioGeneratorOverride = generator;
}

migrateDatabase();

export const scenarioGenerateWorker = new Worker<ScenarioGenerateJobData>(
  scenarioGenerateQueueName,
  async (job) => {
    const startedMessage = createStartedScenarioGenerateProgressMessage(String(job.id), job.data);

    await saveScenarioGenerateSnapshot(startedMessage);
    await publishScenarioGenerateProgress(startedMessage);

    const generatedScenario = await generateScenario(job.data.message);
    const persistedScenario = await persistScenario(generatedScenario);

    const completedMessage = createCompletedScenarioGenerateProgressMessage(
      String(job.id),
      job.data,
      persistedScenario.processedAt,
    );

    await saveScenarioGenerateSnapshot(completedMessage);
    await publishScenarioGenerateProgress(completedMessage);

    return persistedScenario;
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
