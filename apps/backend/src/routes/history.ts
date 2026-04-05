import { historyDetailResponseSchema, historyListQuerySchema, sessionTypeSchema } from "@english-coach/contract";
import { db } from "@english-coach/database";
import {
  freeFormContexts,
  knowledgeItems,
  scenarios,
  sessionErrors,
  sessionHistory,
  sessionKnowledgeItems,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { and, asc, count, desc, eq, isNotNull, like, or } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../http/pagination";

const historySortColumnMap = {
  endedAt: sessionHistory.endedAt,
  startedAt: sessionHistory.startedAt,
  title: scenarios.title,
} as const;

function createHistorySearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(
    like(scenarios.title, pattern),
    like(sessionHistory.review, pattern),
    like(sessionHistory.sessionType, pattern),
  );
}

function findMatchedTranscriptTurnIndex(turns: Array<{ speaker: "user" | "agent"; text: string }>, utterance: string) {
  return turns.findIndex(
    (turn) => turn.speaker === "user" && (turn.text.includes(utterance) || utterance.includes(turn.text)),
  );
}

export function registerHistoryRoutes(app: BackendApp) {
  app.get("/api/history", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const parsedQuery = historyListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid history query parameters" }, 400);
    }

    const { page, pageSize, search, sessionType, sortBy, sortDirection } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const visibilityCondition = isNotNull(sessionHistory.endedAt);
    const accessCondition =
      currentUser.role === "admin"
        ? visibilityCondition
        : and(eq(sessionHistory.userId, currentUser.id), visibilityCondition);
    const searchCondition = createHistorySearchCondition(search);
    const sessionTypeCondition = sessionType ? eq(sessionHistory.sessionType, sessionType) : null;
    const conditions = [accessCondition, searchCondition, sessionTypeCondition].filter(
      (condition): condition is NonNullable<typeof condition> => Boolean(condition),
    );
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const orderColumn = historySortColumnMap[sortBy];
    const orderExpression = sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);

    const baseQuery = db
      .select({
        completedGoals: sessionHistory.completedGoals,
        endedAt: sessionHistory.endedAt,
        freeFormContextId: sessionHistory.freeFormContextId,
        id: sessionHistory.id,
        review: sessionHistory.review,
        scenarioId: sessionHistory.scenarioId,
        scenarioTitle: scenarios.title,
        selectedCharacterIndex: sessionHistory.selectedCharacterIndex,
        sessionType: sessionHistory.sessionType,
        startedAt: sessionHistory.startedAt,
        userId: sessionHistory.userId,
      })
      .from(sessionHistory)
      .leftJoin(scenarios, eq(sessionHistory.scenarioId, scenarios.id));

    const [records, totalResult] = await Promise.all([
      baseQuery.where(whereCondition).orderBy(orderExpression, desc(sessionHistory.id)).limit(pageSize).offset(offset),
      db
        .select({ total: count() })
        .from(sessionHistory)
        .leftJoin(scenarios, eq(sessionHistory.scenarioId, scenarios.id))
        .where(whereCondition),
    ]);

    return context.json(
      createPageResponse(
        records.map((record) => ({
          canReopen: record.sessionType === sessionTypeSchema.enum["free-form"] && record.endedAt !== null,
          ...record,
          title: record.scenarioTitle ?? "Free-form",
        })),
        totalResult[0]?.total ?? 0,
        page,
        pageSize,
      ),
    );
  });

  app.get("/api/history/:sessionId", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const sessionId = context.req.param("sessionId");
    const accessCondition =
      currentUser.role === "admin"
        ? eq(sessionHistory.id, sessionId)
        : and(eq(sessionHistory.id, sessionId), eq(sessionHistory.userId, currentUser.id));

    const [record] = await db
      .select({
        completedGoals: sessionHistory.completedGoals,
        contextDocument: freeFormContexts.content,
        endedAt: sessionHistory.endedAt,
        freeFormContextId: sessionHistory.freeFormContextId,
        id: sessionHistory.id,
        review: sessionHistory.review,
        scenarioCharacters: scenarios.characters,
        scenarioExampleDialogue: scenarios.exampleDialogue,
        scenarioGoals: scenarios.goals,
        scenarioId: sessionHistory.scenarioId,
        scenarioSetting: scenarios.setting,
        scenarioTitle: scenarios.title,
        selectedCharacterIndex: sessionHistory.selectedCharacterIndex,
        sessionType: sessionHistory.sessionType,
        startedAt: sessionHistory.startedAt,
        userId: sessionHistory.userId,
      })
      .from(sessionHistory)
      .leftJoin(scenarios, eq(sessionHistory.scenarioId, scenarios.id))
      .leftJoin(freeFormContexts, eq(sessionHistory.freeFormContextId, freeFormContexts.id))
      .where(accessCondition)
      .limit(1);

    if (!record) {
      return context.json({ error: "Session not found" }, 404);
    }

    const [knowledgeItemRows, errorRows, transcriptRow, occurrenceRows] = await Promise.all([
      db
        .select({
          communicativeFunction: knowledgeItems.communicativeFunction,
          count: sessionKnowledgeItems.count,
          example: knowledgeItems.example,
          examples: sessionKnowledgeItems.examples,
          fixednessLevel: knowledgeItems.fixednessLevel,
          id: sessionKnowledgeItems.id,
          knowledgeItemId: knowledgeItems.id,
          pattern: knowledgeItems.pattern,
          source: knowledgeItems.source,
          speaker: sessionKnowledgeItems.speaker,
          syntaxRole: knowledgeItems.syntaxRole,
        })
        .from(sessionKnowledgeItems)
        .innerJoin(knowledgeItems, eq(sessionKnowledgeItems.knowledgeItemId, knowledgeItems.id))
        .where(eq(sessionKnowledgeItems.sessionHistoryId, sessionId)),
      db.select().from(sessionErrors).where(eq(sessionErrors.sessionHistoryId, sessionId)),
      db.select().from(sessionTranscripts).where(eq(sessionTranscripts.sessionHistoryId, sessionId)).limit(1),
      db
        .select({
          excerpt: sessionKnowledgePointOccurrences.excerpt,
          id: sessionKnowledgePointOccurrences.id,
          knowledgeItemId: sessionKnowledgePointOccurrences.knowledgeItemId,
          occurrenceCount: sessionKnowledgePointOccurrences.occurrenceCount,
          speaker: sessionKnowledgePointOccurrences.speaker,
          transcriptTurnIndex: sessionKnowledgePointOccurrences.transcriptTurnIndex,
        })
        .from(sessionKnowledgePointOccurrences)
        .where(eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionId))
        .orderBy(asc(sessionKnowledgePointOccurrences.transcriptTurnIndex), asc(sessionKnowledgePointOccurrences.id)),
    ]);

    const transcriptTurns = transcriptRow[0]?.turns ?? [];
    const occurrencesByKnowledgeItemId = occurrenceRows.reduce((groups, occurrence) => {
      const bucket = groups.get(occurrence.knowledgeItemId) ?? [];
      bucket.push(occurrence);
      groups.set(occurrence.knowledgeItemId, bucket);
      return groups;
    }, new Map<string, typeof occurrenceRows>());

    return context.json(
      historyDetailResponseSchema.parse({
        errors: errorRows.map((error) => {
          const matchedIndex = findMatchedTranscriptTurnIndex(transcriptTurns, error.utterance);

          return {
            ...error,
            matchedTranscriptTurnIndex: matchedIndex >= 0 ? matchedIndex : null,
          };
        }),
        knowledgeItems: knowledgeItemRows.map((item) => ({
          ...item,
          occurrences: (occurrencesByKnowledgeItemId.get(item.knowledgeItemId) ?? []).map((occurrence) => ({
            excerpt: occurrence.excerpt,
            id: occurrence.id,
            occurrenceCount: occurrence.occurrenceCount,
            speaker: occurrence.speaker,
            transcriptTurnIndex: occurrence.transcriptTurnIndex,
          })),
        })),
        rewrittenTranscript: transcriptRow[0]?.rewrittenTurns ?? [],
        session: {
          canReopen: record.sessionType === "free-form" && record.endedAt !== null,
          completedGoals: record.completedGoals,
          endedAt: record.endedAt,
          freeFormContextId: record.freeFormContextId,
          id: record.id,
          review: record.review,
          scenario:
            record.scenarioId &&
            record.scenarioTitle &&
            record.scenarioSetting &&
            record.scenarioCharacters &&
            record.scenarioGoals &&
            record.scenarioExampleDialogue
              ? {
                  characters: record.scenarioCharacters,
                  exampleDialogue: record.scenarioExampleDialogue,
                  goals: record.scenarioGoals,
                  id: record.scenarioId,
                  setting: record.scenarioSetting,
                  title: record.scenarioTitle,
                }
              : null,
          scenarioId: record.scenarioId,
          selectedCharacterIndex: record.selectedCharacterIndex,
          sessionType: record.sessionType,
          startedAt: record.startedAt,
          title: record.scenarioTitle ?? "Free-form",
          userId: record.userId,
        },
        transcript: transcriptTurns,
        transcriptAnnotations: transcriptRow[0]?.annotations ?? [],
        transcriptCreatedAt: transcriptRow[0]?.createdAt ?? null,
        transcriptTurnAnchors: transcriptTurns.map((turn, index) => ({
          id: `turn-${index}`,
          speaker: turn.speaker === "agent" ? "assistant" : "user",
          transcriptTurnIndex: index,
          turnLabel: `Turn ${index + 1}`,
        })),
        ...(record.contextDocument ? { contextDocument: record.contextDocument } : {}),
      }),
    );
  });
}
