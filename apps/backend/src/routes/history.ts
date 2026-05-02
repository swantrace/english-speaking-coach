import {
  historyDetailResponseSchema,
  historyListQuerySchema,
  sessionTypeSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import {
  freeFormContexts,
  knowledgeItems,
  scenarios,
  sessionErrors,
  sessionHistory,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { and, asc, count, desc, eq, inArray, isNotNull, like, or } from "drizzle-orm";
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

function findMatchedTranscriptTurnIndex(
  turns: Array<{ speaker: "user" | "assistant"; text: string }>,
  utterance: string,
) {
  return turns.findIndex(
    (turn) => turn.speaker === "user" && (turn.text.includes(utterance) || utterance.includes(turn.text)),
  );
}

export function registerHistoryRoutes(app: BackendApp) {
  // List completed session history visible to the current user.
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

  // Fetch one completed session with transcript, errors, and resolved knowledge points.
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

    const [errorRows, transcriptRow, occurrenceRows] = await Promise.all([
      db.select().from(sessionErrors).where(eq(sessionErrors.sessionHistoryId, sessionId)),
      db.select().from(sessionTranscripts).where(eq(sessionTranscripts.sessionHistoryId, sessionId)).limit(1),
      db
        .select({
          id: sessionKnowledgePointOccurrences.id,
          knowledgeItemId: sessionKnowledgePointOccurrences.knowledgeItemId,
          proposedPattern: sessionKnowledgePointOccurrences.proposedPattern,
          transcriptTurnIndex: sessionKnowledgePointOccurrences.transcriptTurnIndex,
          utterance: sessionKnowledgePointOccurrences.utterance,
        })
        .from(sessionKnowledgePointOccurrences)
        .where(eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionId))
        .orderBy(asc(sessionKnowledgePointOccurrences.transcriptTurnIndex), asc(sessionKnowledgePointOccurrences.id)),
    ]);

    const transcriptTurns = transcriptRow[0]?.turns ?? [];
    const resolvedOccurrenceRows = occurrenceRows.filter(
      (occurrence): occurrence is (typeof occurrenceRows)[number] & { knowledgeItemId: string } =>
        Boolean(occurrence.knowledgeItemId),
    );
    const resolvedKnowledgeItemIds = [
      ...new Set(resolvedOccurrenceRows.map((occurrence) => occurrence.knowledgeItemId)),
    ];
    const knowledgeItemRecords = resolvedKnowledgeItemIds.length
      ? await db
          .select({
            communicativeFunction: knowledgeItems.communicativeFunction,
            fixednessLevel: knowledgeItems.fixednessLevel,
            id: knowledgeItems.id,
            pattern: knowledgeItems.pattern,
            syntaxRole: knowledgeItems.syntaxRole,
          })
          .from(knowledgeItems)
          .where(inArray(knowledgeItems.id, resolvedKnowledgeItemIds))
      : [];
    const knowledgeItemsById = new Map(knowledgeItemRecords.map((item) => [item.id, item]));
    const groupedKnowledgeItems = new Map<
      string,
      {
        communicativeFunction: (typeof knowledgeItemRecords)[number]["communicativeFunction"];
        count: number;
        examples: string[];
        fixednessLevel: (typeof knowledgeItemRecords)[number]["fixednessLevel"];
        id: string;
        knowledgeItemId: string;
        occurrences: Array<{
          excerpt: string;
          id: string;
          occurrenceCount: number;
          speaker: "user" | "assistant";
          transcriptTurnIndex: number;
        }>;
        pattern: string;
        speaker: "user" | "assistant";
        syntaxRole: (typeof knowledgeItemRecords)[number]["syntaxRole"];
      }
    >();

    for (const occurrence of resolvedOccurrenceRows) {
      const knowledgeItem = knowledgeItemsById.get(occurrence.knowledgeItemId);

      if (!knowledgeItem) {
        continue;
      }

      const turnSpeaker = transcriptTurns[occurrence.transcriptTurnIndex]?.speaker;
      const speaker: "user" | "assistant" = turnSpeaker === "assistant" ? "assistant" : "user";
      const key = `${occurrence.knowledgeItemId}:${speaker}`;
      const existingGroup = groupedKnowledgeItems.get(key);

      if (!existingGroup) {
        groupedKnowledgeItems.set(key, {
          communicativeFunction: knowledgeItem.communicativeFunction,
          count: 1,
          examples: [occurrence.utterance],
          fixednessLevel: knowledgeItem.fixednessLevel,
          id: key,
          knowledgeItemId: knowledgeItem.id,
          occurrences: [
            {
              excerpt: occurrence.utterance,
              id: occurrence.id,
              occurrenceCount: 1,
              speaker,
              transcriptTurnIndex: occurrence.transcriptTurnIndex,
            },
          ],
          pattern: knowledgeItem.pattern,
          speaker,
          syntaxRole: knowledgeItem.syntaxRole,
        });
        continue;
      }

      const nextExamples = existingGroup.examples.includes(occurrence.utterance)
        ? existingGroup.examples
        : [...existingGroup.examples, occurrence.utterance];
      groupedKnowledgeItems.set(key, {
        ...existingGroup,
        count: existingGroup.count + 1,
        examples: nextExamples,
        occurrences: [
          ...existingGroup.occurrences,
          {
            excerpt: occurrence.utterance,
            id: occurrence.id,
            occurrenceCount: 1,
            speaker,
            transcriptTurnIndex: occurrence.transcriptTurnIndex,
          },
        ],
      });
    }

    const knowledgeItemRows = [...groupedKnowledgeItems.values()];

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
          occurrences: item.occurrences,
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
        transcriptCreatedAt: transcriptRow[0]?.createdAt ?? null,
        transcriptTurnAnchors: transcriptTurns.map((turn, index) => ({
          id: `turn-${index}`,
          speaker: turn.speaker,
          transcriptTurnIndex: index,
          turnLabel: `Turn ${index + 1}`,
        })),
        ...(record.contextDocument ? { contextDocument: record.contextDocument } : {}),
      }),
    );
  });
}
