import type { SessionKnowledgeOccurrence } from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { and, eq, isNull } from "drizzle-orm";

type TranscriptTurns = Array<{ speaker: "assistant" | "user"; text: string; timestampMs: number }>;

export async function persistKnowledgeOccurrencesForSession(
  sessionHistoryId: string,
  turns: TranscriptTurns,
  occurrences: SessionKnowledgeOccurrence[],
) {
  if (!occurrences.length) {
    return [];
  }

  const values = occurrences
    .filter((occurrence) => {
      const turn = turns[occurrence.transcriptTurnIndex];

      return Boolean(turn?.text.trim());
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
    return [];
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

  const unresolvedOccurrences = await db
    .select({ id: sessionKnowledgePointOccurrences.id })
    .from(sessionKnowledgePointOccurrences)
    .where(
      and(
        eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistoryId),
        eq(sessionKnowledgePointOccurrences.status, "proposed"),
        isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
        isNull(sessionKnowledgePointOccurrences.proposedSenses),
      ),
    );

  return unresolvedOccurrences.map(({ id }) => id);
}
