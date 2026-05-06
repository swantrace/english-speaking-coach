import {
  knowledgePointDetailSchema,
  knowledgePointListQuerySchema,
  knowledgePointListResponseSchema,
} from "@english-coach/contract/knowledge";
import { sessionTypeSchema } from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import {
  knowledgeItems,
  scenarios,
  sessionHistory,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { and, asc, desc, eq, inArray, isNotNull, like, sql } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../http/pagination";

function createKnowledgePointSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return like(knowledgeItems.pattern, pattern);
}

function createKnowledgePointAccessCondition(userId: string) {
  return and(eq(sessionHistory.userId, userId), isNotNull(sessionHistory.endedAt));
}

function compareKnowledgePointSummaries(
  left: {
    lastSeenAt: string;
    pattern: string;
    sessionCount: number;
    totalOccurrences: number;
  },
  right: typeof left,
  sortBy: (typeof knowledgePointListQuerySchema.shape.sortBy)["_output"],
  sortDirection: "asc" | "desc",
) {
  const direction = sortDirection === "asc" ? 1 : -1;

  if (sortBy === "pattern") {
    return left.pattern.localeCompare(right.pattern) * direction;
  }

  if (sortBy === "sessionCount") {
    return (left.sessionCount - right.sessionCount) * direction || left.pattern.localeCompare(right.pattern);
  }

  if (sortBy === "totalOccurrences") {
    return (left.totalOccurrences - right.totalOccurrences) * direction || left.pattern.localeCompare(right.pattern);
  }

  return (
    (new Date(left.lastSeenAt).getTime() - new Date(right.lastSeenAt).getTime()) * direction ||
    left.pattern.localeCompare(right.pattern)
  );
}

export function registerKnowledgePointRoutes(app: BackendApp) {
  // List knowledge points observed in the current user's completed sessions.
  app.get("/api/knowledge-points", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const parsedQuery = knowledgePointListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid knowledge point query parameters" }, 400);
    }

    const { page, pageSize, search, sortBy, sortDirection } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const accessCondition = createKnowledgePointAccessCondition(currentUser.id);
    const searchCondition = createKnowledgePointSearchCondition(search);
    const whereCondition = searchCondition ? and(accessCondition, searchCondition) : accessCondition;
    const records = await db
      .select({
        agentOccurrenceCount: sql<number>`0`.mapWith(Number).as("agentOccurrenceCount"),
        communicativeFunction: knowledgeItems.communicativeFunction,
        createdAt: knowledgeItems.createdAt,
        fixednessLevel: knowledgeItems.fixednessLevel,
        id: knowledgeItems.id,
        isPendingReview: knowledgeItems.isPendingReview,
        lastSeenAt: sql<string>`max(coalesce(${sessionHistory.endedAt}, ${sessionHistory.startedAt}))`.as("lastSeenAt"),
        pattern: knowledgeItems.pattern,
        sessionCount: sql<number>`count(distinct ${sessionKnowledgePointOccurrences.sessionHistoryId})`
          .mapWith(Number)
          .as("sessionCount"),
        patternType: knowledgeItems.patternType,
        totalOccurrences: sql<number>`count(${sessionKnowledgePointOccurrences.id})`
          .mapWith(Number)
          .as("totalOccurrences"),
        updatedAt: knowledgeItems.updatedAt,
        userOccurrenceCount: sql<number>`0`.mapWith(Number).as("userOccurrenceCount"),
      })
      .from(sessionKnowledgePointOccurrences)
      .innerJoin(sessionHistory, eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistory.id))
      .innerJoin(knowledgeItems, eq(sessionKnowledgePointOccurrences.knowledgeItemId, knowledgeItems.id))
      .where(whereCondition)
      .groupBy(knowledgeItems.id);

    const sortedRecords = [...records].sort((left, right) =>
      compareKnowledgePointSummaries(left, right, sortBy, sortDirection),
    );

    return context.json(
      knowledgePointListResponseSchema.parse(
        createPageResponse(sortedRecords.slice(offset, offset + pageSize), sortedRecords.length, page, pageSize),
      ),
    );
  });

  // Fetch one knowledge point with the current user's session occurrences.
  app.get("/api/knowledge-points/:knowledgeItemId", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const knowledgeItemId = context.req.param("knowledgeItemId");
    const accessCondition = createKnowledgePointAccessCondition(currentUser.id);

    const [summary] = await db
      .select({
        agentOccurrenceCount: sql<number>`0`.mapWith(Number).as("agentOccurrenceCount"),
        communicativeFunction: knowledgeItems.communicativeFunction,
        createdAt: knowledgeItems.createdAt,
        fixednessLevel: knowledgeItems.fixednessLevel,
        id: knowledgeItems.id,
        lastSeenAt: sql<string>`max(coalesce(${sessionHistory.endedAt}, ${sessionHistory.startedAt}))`.as("lastSeenAt"),
        pattern: knowledgeItems.pattern,
        sessionCount: sql<number>`count(distinct ${sessionKnowledgePointOccurrences.sessionHistoryId})`
          .mapWith(Number)
          .as("sessionCount"),
        senses: knowledgeItems.senses,
        patternType: knowledgeItems.patternType,
        totalOccurrences: sql<number>`count(${sessionKnowledgePointOccurrences.id})`
          .mapWith(Number)
          .as("totalOccurrences"),
        updatedAt: knowledgeItems.updatedAt,
      })
      .from(sessionKnowledgePointOccurrences)
      .innerJoin(sessionHistory, eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistory.id))
      .innerJoin(knowledgeItems, eq(sessionKnowledgePointOccurrences.knowledgeItemId, knowledgeItems.id))
      .where(and(accessCondition, eq(knowledgeItems.id, knowledgeItemId)))
      .groupBy(knowledgeItems.id)
      .limit(1);

    if (!summary) {
      return context.json({ error: "Knowledge point not found" }, 404);
    }

    const occurrences = await db
      .select({
        id: sessionKnowledgePointOccurrences.id,
        proposedPattern: sessionKnowledgePointOccurrences.proposedPattern,
        scenarioTitle: scenarios.title,
        sessionEndedAt: sessionHistory.endedAt,
        sessionHistoryId: sessionHistory.id,
        sessionStartedAt: sessionHistory.startedAt,
        sessionType: sessionHistory.sessionType,
        transcriptTurnIndex: sessionKnowledgePointOccurrences.transcriptTurnIndex,
        utterance: sessionKnowledgePointOccurrences.utterance,
      })
      .from(sessionKnowledgePointOccurrences)
      .innerJoin(sessionHistory, eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistory.id))
      .leftJoin(scenarios, eq(sessionHistory.scenarioId, scenarios.id))
      .where(and(accessCondition, eq(sessionKnowledgePointOccurrences.knowledgeItemId, knowledgeItemId)))
      .orderBy(
        desc(sql`coalesce(${sessionHistory.endedAt}, ${sessionHistory.startedAt})`),
        asc(sessionKnowledgePointOccurrences.transcriptTurnIndex),
        asc(sessionKnowledgePointOccurrences.id),
      );

    const occurrenceSessionIds = [...new Set(occurrences.map((occurrence) => occurrence.sessionHistoryId))];
    const transcriptRows = occurrenceSessionIds.length
      ? await db
          .select({
            sessionHistoryId: sessionTranscripts.sessionHistoryId,
            turns: sessionTranscripts.turns,
          })
          .from(sessionTranscripts)
          .where(inArray(sessionTranscripts.sessionHistoryId, occurrenceSessionIds))
      : [];
    const transcriptMap = new Map(transcriptRows.map((row) => [row.sessionHistoryId, row.turns]));

    return context.json(
      knowledgePointDetailSchema.parse({
        ...summary,
        occurrences: occurrences.map((occurrence) => ({
          excerpt: occurrence.utterance,
          id: occurrence.id,
          occurrenceCount: 1,
          sessionEndedAt: occurrence.sessionEndedAt,
          sessionHistoryId: occurrence.sessionHistoryId,
          sessionStartedAt: occurrence.sessionStartedAt,
          sessionTitle:
            occurrence.sessionType === sessionTypeSchema.enum["free-form"]
              ? "Free-form"
              : (occurrence.scenarioTitle ?? "Role-play"),
          sessionType: occurrence.sessionType,
          speaker:
            transcriptMap.get(occurrence.sessionHistoryId)?.[occurrence.transcriptTurnIndex]?.speaker === "assistant"
              ? "assistant"
              : "user",
          transcriptTurnIndex: occurrence.transcriptTurnIndex,
        })),
      }),
    );
  });
}
