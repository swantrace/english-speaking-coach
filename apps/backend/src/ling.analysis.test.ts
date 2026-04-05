import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { db, migrateDatabase } from "@english-coach/database";
import {
  freeFormContexts,
  sessionHistory,
  sessionKnowledgeItems,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import { processLingAnalysisSession, setLingAnalysisGeneratorForTests } from "./lib/queues/ling.analysis";

describe("lingAnalysis knowledge point occurrence persistence", () => {
  beforeAll(async () => {
    migrateDatabase();
  });

  beforeEach(async () => {
    setLingAnalysisGeneratorForTests(null);
  });

  test("persists transcript-turn knowledge point occurrences alongside session aggregates", async () => {
    const now = new Date().toISOString();
    const freeFormContextId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    await db.insert(freeFormContexts).values({
      content: "Practice making polite requests.",
      createdAt: now,
      id: freeFormContextId,
    });

    await db.insert(sessionHistory).values({
      endedAt: now,
      freeFormContextId,
      id: sessionId,
      sessionType: "free-form",
      startedAt: now,
      userId: "system",
    });

    await db.insert(sessionTranscripts).values({
      createdAt: now,
      id: crypto.randomUUID(),
      sessionHistoryId: sessionId,
      turns: [
        { speaker: "user", text: "I'd like a coffee.", timestampMs: 1_000 },
        { speaker: "agent", text: "Of course.", timestampMs: 2_000 },
        { speaker: "user", text: "I'd like a coffee.", timestampMs: 3_000 },
      ],
    });

    setLingAnalysisGeneratorForTests(async () => ({
      errors: [],
      knowledgeItemsUsed: [
        {
          communicativeFunction: "make_request_or_offer",
          count: 2,
          example: "I'd like a coffee, please.",
          fixednessLevel: "fixed_expression",
          pattern: `I'd like <np> worker ${Date.now()}`,
          speaker: "user",
          syntaxRole: "clause_pattern",
          usageExcerpts: ["I'd like a coffee.", "I'd like a coffee."],
        },
      ],
      rewrittenUserTurns: [],
      review: "Useful request language with repetition that can now be linked back to exact turns.",
    }));

    await processLingAnalysisSession(sessionId);

    const occurrenceRows = await db
      .select()
      .from(sessionKnowledgePointOccurrences)
      .where(eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionId));
    const aggregateRows = await db
      .select()
      .from(sessionKnowledgeItems)
      .where(eq(sessionKnowledgeItems.sessionHistoryId, sessionId));
    const [transcriptRecord] = await db
      .select()
      .from(sessionTranscripts)
      .where(eq(sessionTranscripts.sessionHistoryId, sessionId))
      .limit(1);

    expect(aggregateRows).toHaveLength(1);
    expect(aggregateRows[0]?.count).toBe(2);
    expect(occurrenceRows.map((row) => row.transcriptTurnIndex).sort((left, right) => left - right)).toEqual([0, 2]);
    expect(occurrenceRows.map((row) => row.excerpt)).toEqual(["I'd like a coffee.", "I'd like a coffee."]);
    expect(transcriptRecord?.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          coachingKind: "knowledge_hint",
          kind: "coaching",
          source: "post-session-review",
          transcriptTurnIndex: 0,
        }),
      ]),
    );
  });
});
