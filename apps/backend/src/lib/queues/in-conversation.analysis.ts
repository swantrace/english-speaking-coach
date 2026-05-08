import {
  type InConversationAnalysisJob,
  type InConversationAnalysisResult,
  type InConversationKnowledgeOccurrence,
  inConversationAnalysisJobName,
  inConversationAnalysisJobSchema,
  inConversationAnalysisQueueName,
  inConversationAnalysisResultSchema,
  type SessionTurn,
  uiUpdatePacketSchema,
  workerFeedbackPacketSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { type Job, Queue, Worker } from "bullmq";
import { DataPacket_Kind } from "livekit-server-sdk";
import { getProvider, modelConfig } from "../ai";
import { defaultProviderId } from "../env";
import { getRoomServiceClient } from "../livekit";
import { producerRedis, workerRedis } from "../redis";
import { persistTranscriptBatchForSession as persistTranscriptBatchForSessionImpl } from "./helpers/session-transcripts.persistence";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

export {
  mergeTranscriptTurns,
  persistRewrittenTranscriptTurnsForSession,
  persistTranscriptBatchForSession,
} from "./helpers/session-transcripts.persistence";

const sessionAi = getProvider(defaultProviderId).session;
const models = modelConfig[defaultProviderId];

export const inConversationAnalysisQueue = new Queue<InConversationAnalysisJob>(inConversationAnalysisQueueName, {
  connection: producerRedis,
});

function getLatestUserTurnIndex(job: InConversationAnalysisJob) {
  for (let index = job.turns.length - 1; index >= 0; index -= 1) {
    if (job.turns[index]?.speaker === "user") {
      return job.transcriptStartIndex + index;
    }
  }

  return undefined;
}

let inConversationAnalysisGeneratorOverride:
  | ((job: InConversationAnalysisJob) => Promise<InConversationAnalysisResult>)
  | null = null;

async function generateInConversationFeedback(job: InConversationAnalysisJob) {
  if (inConversationAnalysisGeneratorOverride) {
    return inConversationAnalysisResultSchema.parse(await inConversationAnalysisGeneratorOverride(job));
  }

  const indexedTurns = job.turns.map((turn, index) => ({
    ...turn,
    transcriptTurnIndex: job.transcriptStartIndex + index,
  }));

  const result = await sessionAi.generateInConversationAnalysis(
    models.CONVERSATION_ANALYSIS_MODEL,
    {
      indexedTurns,
    },
    {
      metadata: {
        roomName: job.roomName,
        transcriptStartIndex: job.transcriptStartIndex,
      },
      sessionHistoryId: job.sessionHistoryId,
    },
  );

  return inConversationAnalysisResultSchema.parse(result);
}

async function persistInConversationOccurrences(
  sessionHistoryId: string,
  turns: SessionTurn[],
  transcriptStartIndex: number,
  occurrences: InConversationKnowledgeOccurrence[],
) {
  if (!occurrences.length) {
    return;
  }

  const values = occurrences
    .filter((occurrence) => {
      const localIndex = occurrence.transcriptTurnIndex - transcriptStartIndex;
      const turn = turns[localIndex];

      if (!turn) {
        return false;
      }

      return turn.text.trim().length > 0;
    })
    .map((occurrence) => ({
      id: crypto.randomUUID(),
      knowledgeItemId: null,
      proposedPattern: occurrence.proposedPattern,
      sessionHistoryId,
      transcriptTurnIndex: occurrence.transcriptTurnIndex,
      utterance: occurrence.utterance,
    }));

  if (!values.length) {
    return;
  }

  await db
    .insert(sessionKnowledgePointOccurrences)
    .values(values)
    .onConflictDoNothing({
      target: [
        sessionKnowledgePointOccurrences.sessionHistoryId,
        sessionKnowledgePointOccurrences.transcriptTurnIndex,
        sessionKnowledgePointOccurrences.proposedPattern,
        sessionKnowledgePointOccurrences.utterance,
      ],
    });
}

async function handleInConversationAnalysisJob(job: Job<InConversationAnalysisJob>) {
  // Step 1: validate job payload
  const parsedJob = inConversationAnalysisJobSchema.parse(job.data);

  // Step 2: persist transcript batch before analysis
  await persistTranscriptBatchForSessionImpl(parsedJob.sessionHistoryId, parsedJob.turns);

  // Step 3: generate worker feedback and UI prompts
  const result = await generateInConversationFeedback(parsedJob);

  // Step 4: persist any knowledge occurrences discovered
  await persistInConversationOccurrences(
    parsedJob.sessionHistoryId,
    parsedJob.turns,
    parsedJob.transcriptStartIndex,
    result.occurrences,
  );

  // Step 5: publish packets to LiveKit
  const roomServiceClient = getRoomServiceClient();

  const workerFeedbackPacket = workerFeedbackPacketSchema.parse({
    message: result.workerFeedbackMessage,
    sessionHistoryId: parsedJob.sessionHistoryId,
    type: "worker-feedback",
  });

  const uiUpdatePackets = result.uiPrompts.map((prompt) =>
    uiUpdatePacketSchema.parse({
      prompt: prompt.prompt,
      promptKind: prompt.promptKind,
      sessionHistoryId: parsedJob.sessionHistoryId,
      transcriptTurnIndex: prompt.transcriptTurnIndex ?? getLatestUserTurnIndex(parsedJob),
      type: "ui-update",
    }),
  );

  await Promise.all([
    roomServiceClient.sendData(
      parsedJob.roomName,
      new TextEncoder().encode(JSON.stringify(workerFeedbackPacket)),
      DataPacket_Kind.RELIABLE,
      { topic: workerFeedbackPacket.type },
    ),
    ...uiUpdatePackets.map((packet) =>
      roomServiceClient.sendData(
        parsedJob.roomName,
        new TextEncoder().encode(JSON.stringify(packet)),
        DataPacket_Kind.RELIABLE,
        { topic: packet.type },
      ),
    ),
  ]);

  return result;
}

export const inConversationAnalysisWorker = new Worker<InConversationAnalysisJob>(
  inConversationAnalysisQueueName,
  handleInConversationAnalysisJob,
  {
    connection: workerRedis,
  },
);

inConversationAnalysisWorker.on("completed", (job) => {
  logWorkerCompleted(inConversationAnalysisJobName, job);
});

inConversationAnalysisWorker.on("failed", (job, error) => {
  logWorkerFailed(inConversationAnalysisJobName, job, error);
});

export function setInConversationAnalysisGeneratorForTests(
  generator: ((job: InConversationAnalysisJob) => Promise<InConversationAnalysisResult>) | null,
) {
  inConversationAnalysisGeneratorOverride = generator;
}
