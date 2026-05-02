import { studentDashboardResponseSchema } from "@english-coach/contract/common";
import { db } from "@english-coach/database";
import { sessionHistory, sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";

const STUDENT_DASHBOARD_TREND_DAYS = 21;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getUtcDayStart(timestampMs: number) {
  const date = new Date(timestampMs);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getUtcDateKey(timestampMs: number) {
  return new Date(getUtcDayStart(timestampMs)).toISOString().slice(0, 10);
}

function parseTimestamp(value: Date | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function createTrendDays(nowMs = Date.now()) {
  const todayStartMs = getUtcDayStart(nowMs);

  return Array.from({ length: STUDENT_DASHBOARD_TREND_DAYS }, (_, index) => {
    const startMs = todayStartMs - (STUDENT_DASHBOARD_TREND_DAYS - index - 1) * MILLISECONDS_PER_DAY;

    return {
      date: new Date(startMs).toISOString().slice(0, 10),
      endMs: startMs + MILLISECONDS_PER_DAY - 1,
      freeFormSessionsCompleted: 0,
      knowledgeItemsLearned: 0,
      practiceMinutes: 0,
      rolePlaySessionsCompleted: 0,
      startMs,
    };
  });
}

function getSessionDurationMinutes(session: { endedAt: string | null; startedAt: string }) {
  const endedAtMs = parseTimestamp(session.endedAt);
  const startedAtMs = parseTimestamp(session.startedAt);

  if (endedAtMs === null || startedAtMs === null) {
    return 0;
  }

  return Math.max(0, Math.round((endedAtMs - startedAtMs) / 60_000));
}

export function registerStudentDashboardRoutes(app: BackendApp) {
  // Return dashboard totals and recent trend data for the current student.
  app.get("/api/student/dashboard", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const sessions = await db
      .select({
        endedAt: sessionHistory.endedAt,
        id: sessionHistory.id,
        sessionType: sessionHistory.sessionType,
        startedAt: sessionHistory.startedAt,
      })
      .from(sessionHistory)
      .where(and(eq(sessionHistory.userId, currentUser.id), isNotNull(sessionHistory.endedAt)))
      .orderBy(asc(sessionHistory.startedAt), asc(sessionHistory.id));

    const sessionIds = sessions.map((session) => session.id);
    const occurrenceRows = sessionIds.length
      ? await db
          .select({
            endedAt: sessionHistory.endedAt,
            knowledgeItemId: sessionKnowledgePointOccurrences.knowledgeItemId,
            startedAt: sessionHistory.startedAt,
          })
          .from(sessionKnowledgePointOccurrences)
          .innerJoin(sessionHistory, eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistory.id))
          .where(
            and(
              eq(sessionHistory.userId, currentUser.id),
              isNotNull(sessionHistory.endedAt),
              isNotNull(sessionKnowledgePointOccurrences.knowledgeItemId),
            ),
          )
          .orderBy(asc(sessionHistory.startedAt), asc(sessionKnowledgePointOccurrences.id))
      : [];

    const trendDays = createTrendDays();
    const trendMap = new Map(trendDays.map((day) => [day.date, day]));

    for (const session of sessions) {
      const activityAtMs = parseTimestamp(session.endedAt ?? session.startedAt);

      if (activityAtMs === null) {
        continue;
      }

      const trendPoint = trendMap.get(getUtcDateKey(activityAtMs));

      if (!trendPoint) {
        continue;
      }

      trendPoint.practiceMinutes += getSessionDurationMinutes(session);

      if (session.sessionType === "role-play") {
        trendPoint.rolePlaySessionsCompleted += 1;
      } else {
        trendPoint.freeFormSessionsCompleted += 1;
      }
    }

    const seenKnowledgeItemIds = new Set<string>();

    for (const occurrence of occurrenceRows) {
      if (!occurrence.knowledgeItemId || seenKnowledgeItemIds.has(occurrence.knowledgeItemId)) {
        continue;
      }

      seenKnowledgeItemIds.add(occurrence.knowledgeItemId);

      const activityAtMs = parseTimestamp(occurrence.endedAt ?? occurrence.startedAt);

      if (activityAtMs === null) {
        continue;
      }

      const trendPoint = trendMap.get(getUtcDateKey(activityAtMs));

      if (trendPoint) {
        trendPoint.knowledgeItemsLearned += 1;
      }
    }

    const trends = trendDays.map(({ endMs: _endMs, startMs: _startMs, ...trend }) => trend);

    return context.json(
      studentDashboardResponseSchema.parse({
        totals: {
          freeFormSessionsCompleted: sessions.filter((session) => session.sessionType === "free-form").length,
          knowledgeItemsLearned: seenKnowledgeItemIds.size,
          practiceMinutes: sessions.reduce((sum, session) => sum + getSessionDurationMinutes(session), 0),
          rolePlaySessionsCompleted: sessions.filter((session) => session.sessionType === "role-play").length,
        },
        trends,
      }),
    );
  });
}
