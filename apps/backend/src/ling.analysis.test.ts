import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { db, migrateDatabase } from "@english-coach/database";
import {
  freeFormContexts,
  sessionHistory,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import { processLingAnalysisSession, setLingAnalysisGeneratorForTests } from "./lib/queues/ling.analysis";

describe("lingAnalysis post-session processing", () => {
  beforeAll(async () => {
    migrateDatabase();
  });

  beforeEach(async () => {
    setLingAnalysisGeneratorForTests(null);
  });

  test("keeps unresolved occurrences transcript-linked without writing annotations", async () => {
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
        { speaker: "assistant", text: "Of course.", timestampMs: 2_000 },
        { speaker: "user", text: "I'd like a coffee.", timestampMs: 3_000 },
      ],
    });

    await db.insert(sessionKnowledgePointOccurrences).values({
      id: crypto.randomUUID(),
      knowledgeItemId: null,
      proposedPattern: "I'd like <np>",
      sessionHistoryId: sessionId,
      transcriptTurnIndex: 0,
      utterance: "I'd like a coffee.",
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
    const [transcriptRecord] = await db
      .select()
      .from(sessionTranscripts)
      .where(eq(sessionTranscripts.sessionHistoryId, sessionId))
      .limit(1);

    expect(occurrenceRows).toHaveLength(1);
    expect(occurrenceRows[0]?.transcriptTurnIndex).toBe(0);
    expect(occurrenceRows[0]?.utterance).toBe("I'd like a coffee.");
    expect(transcriptRecord?.sessionHistoryId).toBe(sessionId);
  });
});
