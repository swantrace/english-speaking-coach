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
  promptSections: string[],
): Promise<z.output<TSchema>> {
  const { output } = await generateText({
    model: openai(process.env.SCENARIO_GENERATE_MODEL ?? "gpt-4.1-mini"),
    output: Output.object({
      schema,
    }),
    prompt: promptSections.join("\n\n"),
    providerOptions: {
      openai: {
        strictJsonSchema: false,
      },
    },
  });

  return schema.parse(output);
}

async function generateScenarioStory(prompt: string): Promise<ScenarioStory> {
  return generateScenarioObject(scenarioStorySchema, [
    "You expand a short role-play brief into a concrete two-person spoken English scenario.",
    "The brief can describe any kind of interaction. Do not assume customer service, complaints, or business context unless the brief implies it.",
    "Return a concise title, a scene-setting summary, exactly two characters, and a detailed story.",
    "The two characters are the two roles in the scenario. Do not assign one in advance as the learner or the agent.",
    "The title should work as the main scenario card headline and as a quick label in lists and history.",
    "The setting should be a compact summary that works as a browser card subtitle and as prompt input for the agent.",
    "The story should be detailed enough for later steps to extract goals and write an example dialogue. It must clearly explain the background, what each person wants, the main obstacle or misunderstanding, any pressure or constraints on either side, the information that must be clarified during the conversation, and the most plausible path toward resolution.",
    "Role-play brief:",
    prompt,
  ]);
}

async function generateScenarioGoals(story: ScenarioStory) {
  return generateScenarioObject(scenarioGoalsSchema, [
    "You convert a two-person scenario story into structured role-play goals.",
    "Use only details that are supported by the scenario story package.",
    "Top-level intents should be reusable conversational actions, not full sentences.",
    "Top-level slots should be concrete pieces of information that matter for resolving the interaction.",
    "Goals should describe what the learner must accomplish, follow a natural conversational order, and stay minimal while still covering the full interaction.",
    "Every required_intents and required_slots entry must reference names declared in the top-level intents and slots arrays.",
    "Do not include runtime progress or status.",
    "Scenario story package:",
    JSON.stringify(story, null, 2),
  ]);
}

async function generateScenarioDialogue(story: ScenarioStory, goals: z.infer<typeof scenarioGoalsSchema>) {
  const result = await generateScenarioObject(scenarioDialogueExampleSchema, [
    "You write a short example dialogue for a two-person spoken English role-play.",
    "Use characterIndex 0 or 1 on each turn so every line is tied to one of the two generated characters.",
    "characterIndex 0 refers to characters[0]. characterIndex 1 refers to characters[1].",
    "The dialogue should sound natural, reflect the characters and conflict, and show a credible path through the interaction.",
    "Make the dialogue concise but complete enough to demonstrate how the scenario can succeed.",
    "The dialogue must visibly cover the key goals, intents, and slot collection implied by the goals object.",
    "Scenario story package:",
    JSON.stringify(story, null, 2),
    "Goals object:",
    JSON.stringify(goals, null, 2),
  ]);

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
