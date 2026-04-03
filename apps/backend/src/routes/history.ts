import { db } from "@english-coach/database";
import {
  freeFormContexts,
  knowledgeItems,
  scenarios,
  sessionErrors,
  sessionHistory,
  sessionKnowledgeItems,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import { createPaginatedResponse, paginationQuerySchema } from "../http/pagination";

export function registerHistoryRoutes(app: BackendApp) {
  app.get("/api/history", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const parsedQuery = paginationQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid history query parameters" }, 400);
    }

    const { limit, offset } = parsedQuery.data;
    const visibilityCondition = isNotNull(sessionHistory.endedAt);
    const accessCondition =
      currentUser.role === "admin"
        ? visibilityCondition
        : and(eq(sessionHistory.userId, currentUser.id), visibilityCondition);

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
      baseQuery.where(accessCondition).orderBy(desc(sessionHistory.startedAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(sessionHistory).where(accessCondition),
    ]);

    return context.json(
      createPaginatedResponse(
        records.map((record) => ({
          canReopen: record.sessionType === "free-form" && record.endedAt !== null,
          ...record,
          title: record.scenarioTitle ?? "Free-form",
        })),
        totalResult[0]?.total ?? 0,
        limit,
        offset,
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

    const [knowledgeItemRows, errorRows, transcriptRow] = await Promise.all([
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
    ]);

    return context.json({
      errors: errorRows,
      knowledgeItems: knowledgeItemRows,
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
      transcript: transcriptRow[0]?.turns ?? [],
      transcriptCreatedAt: transcriptRow[0]?.createdAt ?? null,
      ...(record.contextDocument ? { contextDocument: record.contextDocument } : {}),
    });
  });
}
