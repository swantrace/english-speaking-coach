import { openai } from "@ai-sdk/openai";
import {
  type InConversationAnalysisJob,
  type InConversationKnowledgeOccurrence,
  type InConversationUiPrompt,
  inConversationAnalysisJobName,
  inConversationAnalysisJobSchema,
  inConversationAnalysisQueueName,
  inConversationAnalysisResultSchema,
  type RewrittenTranscriptTurn,
  rewrittenTranscriptTurnSchema,
  type SessionTurn,
  uiUpdatePacketSchema,
  workerFeedbackPacketSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionKnowledgePointOccurrences, sessionTranscripts } from "@english-coach/database/schema";
import { generateText, Output } from "ai";
import { Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { DataPacket_Kind } from "livekit-server-sdk";
import { getRoomServiceClient } from "../livekit";
import { producerRedis, workerRedis } from "../redis";

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
  | ((job: InConversationAnalysisJob) => Promise<{
      occurrences: InConversationKnowledgeOccurrence[];
      uiPrompts: InConversationUiPrompt[];
      workerFeedbackMessage: string;
    }>)
  | null = null;

type TranscriptRewrittenTurns = NonNullable<typeof sessionTranscripts.$inferSelect.rewrittenTurns>;

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

function mergeRewrittenTranscriptTurns(
  existingTurns: TranscriptRewrittenTurns,
  incomingTurns: RewrittenTranscriptTurn[],
) {
  const mergedByTurnIndex = new Map(existingTurns.map((turn) => [turn.transcriptTurnIndex, turn]));

  for (const turn of incomingTurns) {
    mergedByTurnIndex.set(turn.transcriptTurnIndex, rewrittenTranscriptTurnSchema.parse(turn));
  }

  return [...mergedByTurnIndex.values()].sort((left, right) => left.transcriptTurnIndex - right.transcriptTurnIndex);
}

async function readExistingTranscriptRecord(sessionHistoryId: string) {
  const [existingTranscript] = await db
    .select()
    .from(sessionTranscripts)
    .where(eq(sessionTranscripts.sessionHistoryId, sessionHistoryId))
    .limit(1);

  return existingTranscript;
}

async function upsertTranscriptRecord({
  rewrittenTurns,
  sessionHistoryId,
  turns,
}: {
  rewrittenTurns?: RewrittenTranscriptTurn[];
  sessionHistoryId: string;
  turns?: SessionTurn[];
}) {
  const existingTranscript = await readExistingTranscriptRecord(sessionHistoryId);
  const nextTurns = turns ?? existingTranscript?.turns ?? [];
  const nextRewrittenTurns = rewrittenTurns
    ? mergeRewrittenTranscriptTurns(existingTranscript?.rewrittenTurns ?? [], rewrittenTurns)
    : (existingTranscript?.rewrittenTurns ?? []);

  await db
    .insert(sessionTranscripts)
    .values({
      createdAt: existingTranscript?.createdAt ?? new Date().toISOString(),
      id: existingTranscript?.id ?? crypto.randomUUID(),
      rewrittenTurns: nextRewrittenTurns,
      sessionHistoryId,
      turns: nextTurns,
    })
    .onConflictDoUpdate({
      set: {
        rewrittenTurns: nextRewrittenTurns,
        turns: nextTurns,
      },
      target: sessionTranscripts.sessionHistoryId,
    });
}

export async function persistTranscriptBatchForSession(sessionHistoryId: string, turns: SessionTurn[]) {
  const existingTranscript = await readExistingTranscriptRecord(sessionHistoryId);
  const nextTurns = existingTranscript ? mergeTranscriptTurns(existingTranscript.turns, turns) : turns;

  await upsertTranscriptRecord({ sessionHistoryId, turns: nextTurns });
}

export async function persistRewrittenTranscriptTurnsForSession(
  sessionHistoryId: string,
  rewrittenTurns: RewrittenTranscriptTurn[],
) {
  if (!rewrittenTurns.length) {
    return;
  }

  await upsertTranscriptRecord({ rewrittenTurns, sessionHistoryId });
}

async function generateInConversationFeedback(job: InConversationAnalysisJob) {
  if (inConversationAnalysisGeneratorOverride) {
    return inConversationAnalysisGeneratorOverride(job);
  }

  if (process.env.LING_ANALYSIS_USE_TEST_GENERATOR === "1") {
    return inConversationAnalysisResultSchema.parse({
      occurrences: [
        {
          proposedPattern: "I'd like <np>",
          transcriptTurnIndex: getLatestUserTurnIndex(job) ?? job.transcriptStartIndex,
          utterance: "I'd like coffee",
        },
      ],
      uiPrompts: [
        {
          prompt: "Ask the agent why the last tense choice sounds more natural here.",
          promptKind: "error_hint",
          transcriptTurnIndex: getLatestUserTurnIndex(job),
        },
      ],
      workerFeedbackMessage: "Keep pushing the learner to answer with a little more detail.",
    });
  }

  const indexedTurns = job.turns.map((turn, index) => ({
    ...turn,
    transcriptTurnIndex: job.transcriptStartIndex + index,
  }));

  const { output } = await generateText({
    model: openai(process.env.LING_ANALYSIS_MODEL ?? "gpt-4.1-mini"),
    output: Output.object({
      schema: inConversationAnalysisResultSchema,
    }),
    prompt: [
      "You analyze recent turns from an English-speaking coaching conversation.",
      "Return up to 3 transcript-aligned UI prompts and one short worker feedback message for the voice agent.",
      "Also extract up to 12 unresolved knowledge occurrences with { transcriptTurnIndex, proposedPattern, utterance }.",
      "Only include occurrences where transcriptTurnIndex points to a user or assistant turn that exists in the transcript.",
      "Use concise reusable pattern notation like 'I'd like <np>' for proposedPattern.",
      "Always include uiPrompts. If there are no useful prompts, return uiPrompts as [].",
      "Each UI prompt must be a brief learner-facing follow-up cue, not a full explanation.",
      "Phrase prompts like something the learner could ask next, for example 'Ask the agent why...' or 'Ask how...'.",
      "Use promptKind='error_hint' for learner mistakes, 'knowledge_hint' for useful language patterns worth noticing, and 'fluency_hint' for pacing or clarity cues.",
      "Anchor prompts to transcriptTurnIndex values from the transcript below whenever possible.",
      "The worker feedback message should be a compact coaching hint for the agent to append into chat context.",
      JSON.stringify(indexedTurns),
    ].join("\n\n"),
  });

  return output;
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

export const inConversationAnalysisWorker = new Worker<InConversationAnalysisJob>(
  inConversationAnalysisQueueName,
  async (job) => {
    const parsedJob = inConversationAnalysisJobSchema.parse(job.data);

    await persistTranscriptBatchForSession(parsedJob.sessionHistoryId, parsedJob.turns);

    const result = await generateInConversationFeedback(parsedJob);
    await persistInConversationOccurrences(
      parsedJob.sessionHistoryId,
      parsedJob.turns,
      parsedJob.transcriptStartIndex,
      result.occurrences,
    );
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
    | ((job: InConversationAnalysisJob) => Promise<{
        occurrences: InConversationKnowledgeOccurrence[];
        uiPrompts: InConversationUiPrompt[];
        workerFeedbackMessage: string;
      }>)
    | null,
) {
  inConversationAnalysisGeneratorOverride = generator;
}
