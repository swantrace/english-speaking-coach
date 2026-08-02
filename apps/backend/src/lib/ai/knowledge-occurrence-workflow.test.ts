import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, migrateDatabase } from "@english-coach/database";
import {
  freeFormContexts,
  knowledgeItems,
  sessionHistory,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
  user,
} from "@english-coach/database/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { AppVariables } from "../../http/context";
import { registerAdminKnowledgeOccurrenceRoutes } from "../../routes/admin/knowledge-occurrences";
import { registerHistoryRoutes } from "../../routes/history";
import { findKnowledgeOccurrenceEnrichmentBackfillIds } from "../queues/helpers/knowledge-occurrence.backfill";
import { buildKnowledgeOccurrenceDraftUpdate } from "../queues/helpers/knowledge-occurrence.enrichment";
import { persistKnowledgeOccurrencesForSession } from "../queues/helpers/knowledge-occurrences.persistence";
import { persistSessionCompletion } from "../queues/helpers/session-completion.persistence";

const testRunId = crypto.randomUUID();
const userId = `workflow-user-${testRunId}`;
const contextId = `workflow-context-${testRunId}`;
const sessionId = `workflow-session-${testRunId}`;
const patternPrefix = `workflow-${testRunId}`;

const senses = [
  {
    example: "I am worried I might miss the deadline.",
    example_zh: "我担心我可能会错过截止日期。",
    grammatical_note: "Use might with the base form.",
    meaning_en: "Expresses concern about a possible event.",
    meaning_zh: "表达对可能发生事件的担忧。",
    order: 1,
  },
];

function createTestApp(role: "admin" | "student", authenticatedUserId = userId) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("*", async (context, next) => {
    context.set("session", null);
    context.set("user", {
      email: `${role}-${testRunId}@example.com`,
      id: authenticatedUserId,
      name: "Workflow test user",
      role,
    } as never);
    await next();
  });

  return app;
}

describe("knowledge occurrence regression workflow", () => {
  beforeAll(async () => {
    await migrateDatabase();
    const now = new Date().toISOString();

    await db.insert(user).values({
      email: `workflow-${testRunId}@example.com`,
      id: userId,
      name: "Workflow test user",
      role: "admin",
      status: "approved",
    });
    await db.insert(freeFormContexts).values({
      content: "Discuss concerns about an upcoming deadline.",
      createdAt: now,
      id: contextId,
      summary: "Deadline concerns",
    });
    await db.insert(sessionHistory).values({
      freeFormContextId: contextId,
      id: sessionId,
      sessionType: "free-form",
      startedAt: now,
      userId,
    });
  });

  afterAll(async () => {
    await db.delete(sessionHistory).where(eq(sessionHistory.id, sessionId));
    await db.delete(freeFormContexts).where(eq(freeFormContexts.id, contextId));
    await db
      .delete(knowledgeItems)
      .where(inArray(knowledgeItems.pattern, [`${patternPrefix}-approved-edited`, `${patternPrefix}-existing`]));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("extracts, enriches, reviews, and exposes only approved or linked occurrences", async () => {
    const turns = [
      { speaker: "user" as const, text: "I am worried I might miss the deadline.", timestampMs: 0 },
      { speaker: "assistant" as const, text: "What could help you finish it?", timestampMs: 1_000 },
    ];
    await persistSessionCompletion({ sessionHistoryId: sessionId, transcript: turns });
    const [completedSession] = await db
      .select({ endedAt: sessionHistory.endedAt })
      .from(sessionHistory)
      .where(eq(sessionHistory.id, sessionId));
    const [persistedTranscript] = await db
      .select({ turns: sessionTranscripts.turns })
      .from(sessionTranscripts)
      .where(eq(sessionTranscripts.sessionHistoryId, sessionId));
    expect(completedSession?.endedAt).not.toBeNull();
    expect(persistedTranscript?.turns).toEqual(turns);

    const extractedIds = await persistKnowledgeOccurrencesForSession(sessionId, turns, [
      {
        proposedPattern: `${patternPrefix}-backfill`,
        transcriptTurnIndex: 0,
        utterance: turns[0].text,
      },
    ]);

    expect(extractedIds).toHaveLength(1);
    const extractedId = extractedIds[0] as string;
    const backfillIds = await findKnowledgeOccurrenceEnrichmentBackfillIds();
    expect(backfillIds).toContain(extractedId);

    const [beforeEnrichment] = await db
      .select()
      .from(sessionKnowledgePointOccurrences)
      .where(eq(sessionKnowledgePointOccurrences.id, extractedId));
    expect(beforeEnrichment?.status).toBe("proposed");
    expect(beforeEnrichment?.knowledgeItemId).toBeNull();
    const formalItemsBeforeReview = await db
      .select({ id: knowledgeItems.id })
      .from(knowledgeItems)
      .where(eq(knowledgeItems.pattern, `${patternPrefix}-backfill`));
    expect(formalItemsBeforeReview).toHaveLength(0);

    const enrichedDraft = buildKnowledgeOccurrenceDraftUpdate({
      communicativeFunction: "express_attitude_or_opinion",
      fixednessLevel: null,
      pattern: `${patternPrefix}-draft`,
      patternType: "grammatical_adjective_that_clause",
      senses,
    });
    await db
      .update(sessionKnowledgePointOccurrences)
      .set(enrichedDraft)
      .where(eq(sessionKnowledgePointOccurrences.id, extractedId));

    const existingKnowledgeItemId = `workflow-existing-${testRunId}`;
    const now = new Date().toISOString();
    await db.insert(knowledgeItems).values({
      createdAt: now,
      id: existingKnowledgeItemId,
      isPendingReview: false,
      pattern: `${patternPrefix}-existing`,
      patternType: "lexical_verb_noun",
      senses,
      updatedAt: now,
    });

    const reviewOccurrenceIds = {
      approve: extractedId,
      hidden: `workflow-hidden-${testRunId}`,
      link: `workflow-link-${testRunId}`,
      reject: `workflow-reject-${testRunId}`,
    };
    await db.insert(sessionKnowledgePointOccurrences).values([
      {
        ...enrichedDraft,
        id: reviewOccurrenceIds.link,
        knowledgeItemId: null,
        sessionHistoryId: sessionId,
        transcriptTurnIndex: 0,
        utterance: "I am worried I might miss the deadline (link).",
      },
      {
        ...enrichedDraft,
        id: reviewOccurrenceIds.reject,
        knowledgeItemId: null,
        sessionHistoryId: sessionId,
        transcriptTurnIndex: 0,
        utterance: "I am worried I might miss the deadline (reject).",
      },
      {
        ...enrichedDraft,
        id: reviewOccurrenceIds.hidden,
        knowledgeItemId: existingKnowledgeItemId,
        sessionHistoryId: sessionId,
        status: "proposed",
        transcriptTurnIndex: 0,
        utterance: "This unresolved occurrence must stay hidden.",
      },
    ]);

    const adminApp = createTestApp("admin");
    registerAdminKnowledgeOccurrenceRoutes(adminApp);
    const approvalResponse = await adminApp.request(`/api/admin/knowledge-occurrences/${extractedId}/approve`, {
      body: JSON.stringify({
        communicativeFunction: enrichedDraft.proposedCommunicativeFunction,
        fixednessLevel: enrichedDraft.proposedFixednessLevel,
        pattern: `${patternPrefix}-approved-edited`,
        patternType: enrichedDraft.proposedPatternType,
        senses: enrichedDraft.proposedSenses,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(approvalResponse.status).toBe(200);
    const approval = (await approvalResponse.json()) as { knowledgeItemId: string; status: string };

    const [approvedItem] = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, approval.knowledgeItemId));
    expect(approvedItem).toMatchObject({
      isPendingReview: false,
      pattern: `${patternPrefix}-approved-edited`,
    });

    const linkResponse = await adminApp.request(`/api/admin/knowledge-occurrences/${reviewOccurrenceIds.link}`, {
      body: JSON.stringify({ knowledgeItemId: existingKnowledgeItemId }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    expect(linkResponse.status).toBe(200);

    const rejectResponse = await adminApp.request(
      `/api/admin/knowledge-occurrences/${reviewOccurrenceIds.reject}/reject`,
      {
        body: JSON.stringify({ reason: "Not useful for this learner." }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    expect(rejectResponse.status).toBe(200);

    const reviewedRows = await db
      .select({ id: sessionKnowledgePointOccurrences.id, status: sessionKnowledgePointOccurrences.status })
      .from(sessionKnowledgePointOccurrences)
      .where(
        and(
          eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionId),
          inArray(sessionKnowledgePointOccurrences.id, Object.values(reviewOccurrenceIds)),
        ),
      );
    expect(new Map(reviewedRows.map((row) => [row.id, row.status]))).toEqual(
      new Map([
        [reviewOccurrenceIds.approve, "approved"],
        [reviewOccurrenceIds.hidden, "proposed"],
        [reviewOccurrenceIds.link, "approved"],
        [reviewOccurrenceIds.reject, "rejected"],
      ]),
    );

    const learnerApp = createTestApp("student");
    registerHistoryRoutes(learnerApp);
    const historyResponse = await learnerApp.request(`/api/history/${sessionId}`);
    expect(historyResponse.status).toBe(200);
    const history = (await historyResponse.json()) as {
      knowledgeItems: Array<{ knowledgeItemId: string; pattern: string }>;
      processing: { analysisStatus: string } | null;
    };
    expect(history.processing?.analysisStatus).toBe("queued");
    expect(history.knowledgeItems.map((item) => item.pattern).sort()).toEqual(
      [`${patternPrefix}-approved-edited`, `${patternPrefix}-existing`].sort(),
    );

    const otherLearnerApp = createTestApp("student", `other-user-${testRunId}`);
    registerHistoryRoutes(otherLearnerApp);
    const forbiddenEventsResponse = await otherLearnerApp.request(`/api/history/${sessionId}/events`);
    expect(forbiddenEventsResponse.status).toBe(404);
  });
});
