import { openai } from "@ai-sdk/openai";
import {
  type InConversationAnalysisJob,
  inConversationAnalysisJobName,
  inConversationAnalysisJobSchema,
  inConversationAnalysisQueueName,
  inConversationAnalysisResultSchema,
  type SessionTurn,
  uiUpdatePacketSchema,
  workerFeedbackPacketSchema,
} from "@english-coach/contract";
import { db } from "@english-coach/database";
import { sessionTranscripts } from "@english-coach/database/schema";
import { generateObject } from "ai";
import { Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { DataPacket_Kind } from "livekit-server-sdk";
import { getRoomServiceClient } from "../livekit";
import { producerRedis, workerRedis } from "../redis";

export const inConversationAnalysisQueue = new Queue<InConversationAnalysisJob>(inConversationAnalysisQueueName, {
  connection: producerRedis,
});

let inConversationAnalysisGeneratorOverride:
  | ((job: InConversationAnalysisJob) => Promise<{ observation: string; workerFeedbackMessage: string }>)
  | null = null;

export function mergeTranscriptTurns(existingTurns: SessionTurn[], incomingTurns: SessionTurn[]) {
  const mergedTurns = [...existingTurns];
  const seenTurnKeys = new Set(existingTurns.map((turn) => `${turn.timestampMs}:${turn.speaker}:${turn.text}`));

  for (const turn of incomingTurns) {
    const turnKey = `${turn.timestampMs}:${turn.speaker}:${turn.text}`;

    if (seenTurnKeys.has(turnKey)) {
      continue;
    }

    seenTurnKeys.add(turnKey);
    mergedTurns.push(turn);
  }

  return mergedTurns.sort((left, right) => left.timestampMs - right.timestampMs);
}

export async function persistTranscriptBatchForSession(sessionHistoryId: string, turns: SessionTurn[]) {
  const [existingTranscript] = await db
    .select()
    .from(sessionTranscripts)
    .where(eq(sessionTranscripts.sessionHistoryId, sessionHistoryId))
    .limit(1);

  const nextTurns = existingTranscript ? mergeTranscriptTurns(existingTranscript.turns, turns) : turns;

  await db
    .insert(sessionTranscripts)
    .values({
      createdAt: existingTranscript?.createdAt ?? new Date().toISOString(),
      id: existingTranscript?.id ?? crypto.randomUUID(),
      sessionHistoryId,
      turns: nextTurns,
    })
    .onConflictDoUpdate({
      set: {
        turns: nextTurns,
      },
      target: sessionTranscripts.sessionHistoryId,
    });
}

async function generateInConversationFeedback(job: InConversationAnalysisJob) {
  if (inConversationAnalysisGeneratorOverride) {
    return inConversationAnalysisGeneratorOverride(job);
  }

  if (process.env.LING_ANALYSIS_USE_TEST_GENERATOR === "1") {
    return inConversationAnalysisResultSchema.parse({
      observation: `Observed ${job.turns.length} recent turns in ${job.roomName}.`,
      workerFeedbackMessage: "Keep pushing the learner to answer with a little more detail.",
    });
  }

  const { object } = await generateObject({
    model: openai(process.env.LING_ANALYSIS_MODEL ?? "gpt-4.1-mini"),
    prompt: [
      "You analyze recent turns from an English-speaking coaching conversation.",
      "Return one UI observation and one short worker feedback message for the voice agent.",
      "The UI observation should be brief and student-facing.",
      "The worker feedback message should be a compact coaching hint for the agent to append into chat context.",
      JSON.stringify(job.turns),
    ].join("\n\n"),
    schema: inConversationAnalysisResultSchema,
  });

  return object;
}

export const inConversationAnalysisWorker = new Worker<InConversationAnalysisJob>(
  inConversationAnalysisQueueName,
  async (job) => {
    const parsedJob = inConversationAnalysisJobSchema.parse(job.data);

    await persistTranscriptBatchForSession(parsedJob.sessionHistoryId, parsedJob.turns);

    const result = await generateInConversationFeedback(parsedJob);
    const roomServiceClient = getRoomServiceClient();

    const workerFeedbackPacket = workerFeedbackPacketSchema.parse({
      message: result.workerFeedbackMessage,
      sessionHistoryId: parsedJob.sessionHistoryId,
      type: "worker-feedback",
    });
    const uiUpdatePacket = uiUpdatePacketSchema.parse({
      observation: result.observation,
      sessionHistoryId: parsedJob.sessionHistoryId,
      type: "ui-update",
    });

    await Promise.all([
      roomServiceClient.sendData(
        parsedJob.roomName,
        new TextEncoder().encode(JSON.stringify(workerFeedbackPacket)),
        DataPacket_Kind.RELIABLE,
        { topic: workerFeedbackPacket.type },
      ),
      roomServiceClient.sendData(
        parsedJob.roomName,
        new TextEncoder().encode(JSON.stringify(uiUpdatePacket)),
        DataPacket_Kind.RELIABLE,
        { topic: uiUpdatePacket.type },
      ),
    ]);

    return result;
  },
  {
    connection: workerRedis,
  },
);

inConversationAnalysisWorker.on("completed", (job) => {
  console.log(`${inConversationAnalysisJobName} job ${job.id} completed`);
});

inConversationAnalysisWorker.on("failed", (job, error) => {
  console.error(`${inConversationAnalysisJobName} job ${job?.id ?? "unknown"} failed`, error);
});

export function setInConversationAnalysisGeneratorForTests(
  generator:
    | ((job: InConversationAnalysisJob) => Promise<{ observation: string; workerFeedbackMessage: string }>)
    | null,
) {
  inConversationAnalysisGeneratorOverride = generator;
}
