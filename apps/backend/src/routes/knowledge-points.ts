import { knowledgePointDetailSchema, knowledgePointListQuerySchema, sessionTypeSchema } from "@english-coach/contract";
import { db } from "@english-coach/database";
import {
  knowledgeItems,
  scenarios,
  sessionHistory,
  sessionKnowledgeItems,
  sessionKnowledgePointOccurrences,
} from "@english-coach/database/schema";
import { and, asc, desc, eq, isNotNull, like, or, sql } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../http/pagination";

function createKnowledgePointSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(like(knowledgeItems.pattern, pattern), like(knowledgeItems.example, pattern));
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
        agentOccurrenceCount:
          sql<number>`coalesce(sum(case when ${sessionKnowledgeItems.speaker} = 'agent' then ${sessionKnowledgeItems.count} else 0 end), 0)`
            .mapWith(Number)
            .as("agentOccurrenceCount"),
        communicativeFunction: knowledgeItems.communicativeFunction,
        createdAt: knowledgeItems.createdAt,
        example: knowledgeItems.example,
        fixednessLevel: knowledgeItems.fixednessLevel,
        id: knowledgeItems.id,
        lastSeenAt: sql<string>`max(coalesce(${sessionHistory.endedAt}, ${sessionHistory.startedAt}))`.as("lastSeenAt"),
        pattern: knowledgeItems.pattern,
        reviewStatus: knowledgeItems.reviewStatus,
        reviewedAt: knowledgeItems.reviewedAt,
        reviewedByUserId: knowledgeItems.reviewedByUserId,
        sessionCount: sql<number>`count(distinct ${sessionKnowledgeItems.sessionHistoryId})`
          .mapWith(Number)
          .as("sessionCount"),
        source: knowledgeItems.source,
        submissionId: knowledgeItems.submissionId,
        syntaxRole: knowledgeItems.syntaxRole,
        totalOccurrences: sql<number>`coalesce(sum(${sessionKnowledgeItems.count}), 0)`
          .mapWith(Number)
          .as("totalOccurrences"),
        updatedAt: knowledgeItems.updatedAt,
        userOccurrenceCount:
          sql<number>`coalesce(sum(case when ${sessionKnowledgeItems.speaker} = 'user' then ${sessionKnowledgeItems.count} else 0 end), 0)`
            .mapWith(Number)
            .as("userOccurrenceCount"),
      })
      .from(sessionKnowledgeItems)
      .innerJoin(sessionHistory, eq(sessionKnowledgeItems.sessionHistoryId, sessionHistory.id))
      .innerJoin(knowledgeItems, eq(sessionKnowledgeItems.knowledgeItemId, knowledgeItems.id))
      .where(whereCondition)
      .groupBy(knowledgeItems.id);

    const sortedRecords = [...records].sort((left, right) =>
      compareKnowledgePointSummaries(left, right, sortBy, sortDirection),
    );

    return context.json(
      createPageResponse(sortedRecords.slice(offset, offset + pageSize), sortedRecords.length, page, pageSize),
    );
  });

  app.get("/api/knowledge-points/:knowledgeItemId", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const knowledgeItemId = context.req.param("knowledgeItemId");
    const accessCondition = createKnowledgePointAccessCondition(currentUser.id);

    const [summary] = await db
      .select({
        agentOccurrenceCount:
          sql<number>`coalesce(sum(case when ${sessionKnowledgeItems.speaker} = 'agent' then ${sessionKnowledgeItems.count} else 0 end), 0)`
            .mapWith(Number)
            .as("agentOccurrenceCount"),
        communicativeFunction: knowledgeItems.communicativeFunction,
        createdAt: knowledgeItems.createdAt,
        example: knowledgeItems.example,
        fixednessLevel: knowledgeItems.fixednessLevel,
        id: knowledgeItems.id,
        lastSeenAt: sql<string>`max(coalesce(${sessionHistory.endedAt}, ${sessionHistory.startedAt}))`.as("lastSeenAt"),
        pattern: knowledgeItems.pattern,
        reviewStatus: knowledgeItems.reviewStatus,
        reviewedAt: knowledgeItems.reviewedAt,
        reviewedByUserId: knowledgeItems.reviewedByUserId,
        sessionCount: sql<number>`count(distinct ${sessionKnowledgeItems.sessionHistoryId})`
          .mapWith(Number)
          .as("sessionCount"),
        source: knowledgeItems.source,
        submissionId: knowledgeItems.submissionId,
        syntaxRole: knowledgeItems.syntaxRole,
        totalOccurrences: sql<number>`coalesce(sum(${sessionKnowledgeItems.count}), 0)`
          .mapWith(Number)
          .as("totalOccurrences"),
        updatedAt: knowledgeItems.updatedAt,
        userOccurrenceCount:
          sql<number>`coalesce(sum(case when ${sessionKnowledgeItems.speaker} = 'user' then ${sessionKnowledgeItems.count} else 0 end), 0)`
            .mapWith(Number)
            .as("userOccurrenceCount"),
      })
      .from(sessionKnowledgeItems)
      .innerJoin(sessionHistory, eq(sessionKnowledgeItems.sessionHistoryId, sessionHistory.id))
      .innerJoin(knowledgeItems, eq(sessionKnowledgeItems.knowledgeItemId, knowledgeItems.id))
      .where(and(accessCondition, eq(knowledgeItems.id, knowledgeItemId)))
      .groupBy(knowledgeItems.id)
      .limit(1);

    if (!summary) {
      return context.json({ error: "Knowledge point not found" }, 404);
    }

    const occurrences = await db
      .select({
        excerpt: sessionKnowledgePointOccurrences.excerpt,
        id: sessionKnowledgePointOccurrences.id,
        occurrenceCount: sessionKnowledgePointOccurrences.occurrenceCount,
        scenarioTitle: scenarios.title,
        sessionEndedAt: sessionHistory.endedAt,
        sessionHistoryId: sessionHistory.id,
        sessionStartedAt: sessionHistory.startedAt,
        sessionType: sessionHistory.sessionType,
        speaker: sessionKnowledgePointOccurrences.speaker,
        transcriptTurnIndex: sessionKnowledgePointOccurrences.transcriptTurnIndex,
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

    return context.json(
      knowledgePointDetailSchema.parse({
        ...summary,
        occurrences: occurrences.map((occurrence) => ({
          excerpt: occurrence.excerpt,
          id: occurrence.id,
          occurrenceCount: occurrence.occurrenceCount,
          sessionEndedAt: occurrence.sessionEndedAt,
          sessionHistoryId: occurrence.sessionHistoryId,
          sessionStartedAt: occurrence.sessionStartedAt,
          sessionTitle:
            occurrence.sessionType === sessionTypeSchema.enum["free-form"]
              ? "Free-form"
              : (occurrence.scenarioTitle ?? "Role-play"),
          sessionType: occurrence.sessionType,
          speaker: occurrence.speaker,
          transcriptTurnIndex: occurrence.transcriptTurnIndex,
        })),
      }),
    );
  });
}
