import {
  type RewrittenTranscriptTurn,
  rewrittenTranscriptTurnSchema,
  type SessionTurn,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionTranscripts } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";

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

export async function replaceRewrittenTranscriptTurnsForSession(
  sessionHistoryId: string,
  rewrittenTurns: RewrittenTranscriptTurn[],
) {
  const existingTranscript = await readExistingTranscriptRecord(sessionHistoryId);

  if (!existingTranscript) {
    throw new Error(`Transcript not found for session ${sessionHistoryId}`);
  }

  await db
    .update(sessionTranscripts)
    .set({
      rewrittenTurns: rewrittenTurns.map((turn) => rewrittenTranscriptTurnSchema.parse(turn)),
    })
    .where(eq(sessionTranscripts.sessionHistoryId, sessionHistoryId));
}
