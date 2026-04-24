import { adminDashboardResponseSchema } from "@english-coach/contract/common";
import { db } from "@english-coach/database";
import { knowledgeItems, scenarios, sessionHistory, user } from "@english-coach/database/schema";
import type { BackendApp } from "../http/context";

const DASHBOARD_TREND_DAYS = 21;
const ACTIVE_USERS_WINDOW_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

type UserDashboardRow = {
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
};

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

  return Array.from({ length: DASHBOARD_TREND_DAYS }, (_, index) => {
    const startMs = todayStartMs - (DASHBOARD_TREND_DAYS - index - 1) * MILLISECONDS_PER_DAY;

    return {
      date: new Date(startMs).toISOString().slice(0, 10),
      endMs: startMs + MILLISECONDS_PER_DAY - 1,
      startMs,
    };
  });
}

function isUserVisibleAt(userRow: Pick<UserDashboardRow, "createdAt" | "deletedAt">, timestampMs: number) {
  const createdAtMs = parseTimestamp(userRow.createdAt);
  const deletedAtMs = parseTimestamp(userRow.deletedAt);

  if (createdAtMs === null) {
    return false;
  }

  return createdAtMs <= timestampMs && (deletedAtMs === null || deletedAtMs > timestampMs);
}

function sumCountsBeforeDate(countsByDate: Map<string, number>, cutoffDate: string) {
  let total = 0;

  for (const [date, count] of countsByDate.entries()) {
    if (date < cutoffDate) {
      total += count;
    }
  }

  return total;
}

export function registerDashboardRoutes(app: BackendApp) {
  app.get("/api/admin/dashboard", async (context) => {
    const [userRows, sessionRows, scenarioRows, knowledgeItemRows] = await Promise.all([
      db.select({ createdAt: user.createdAt, deletedAt: user.deletedAt, id: user.id }).from(user),
      db
        .select({
          endedAt: sessionHistory.endedAt,
          sessionType: sessionHistory.sessionType,
          startedAt: sessionHistory.startedAt,
          userId: sessionHistory.userId,
        })
        .from(sessionHistory),
      db.select({ createdAt: scenarios.createdAt }).from(scenarios),
      db.select({ createdAt: knowledgeItems.createdAt }).from(knowledgeItems),
    ]);

    const trendDays = createTrendDays();
    const today = trendDays.at(-1);

    if (!today) {
      return context.json(
        adminDashboardResponseSchema.parse({
          contentTrend: [],
          summary: {
            activeUsers7d: 0,
            freeFormSessionsCompleted: 0,
            knowledgeItemsCreated: 0,
            rolePlaySessionsCompleted: 0,
            scenariosCreated: 0,
            totalUsers: 0,
          },
          usageTrend: [],
        }),
      );
    }

    const userById = new Map(userRows.map((row) => [row.id, row as UserDashboardRow]));
    const scenarioCreatedCounts = new Map<string, number>();
    const knowledgeItemCreatedCounts = new Map<string, number>();
    const completedRolePlayCounts = new Map<string, number>();
    const completedFreeFormCounts = new Map<string, number>();
    const sessionActivityRows = sessionRows.flatMap((row) => {
      const activityAtMs = parseTimestamp(row.endedAt ?? row.startedAt);
      const endedAtMs = parseTimestamp(row.endedAt);

      if (endedAtMs !== null) {
        const endedAtKey = getUtcDateKey(endedAtMs);
        const currentCount =
          row.sessionType === "role-play"
            ? (completedRolePlayCounts.get(endedAtKey) ?? 0)
            : (completedFreeFormCounts.get(endedAtKey) ?? 0);

        if (row.sessionType === "role-play") {
          completedRolePlayCounts.set(endedAtKey, currentCount + 1);
        } else {
          completedFreeFormCounts.set(endedAtKey, currentCount + 1);
        }
      }

      if (activityAtMs === null) {
        return [];
      }

      return [{ activityAtMs, userId: row.userId }];
    });

    for (const row of scenarioRows) {
      const createdAtMs = parseTimestamp(row.createdAt);

      if (createdAtMs === null) {
        continue;
      }

      const dateKey = getUtcDateKey(createdAtMs);
      scenarioCreatedCounts.set(dateKey, (scenarioCreatedCounts.get(dateKey) ?? 0) + 1);
    }

    for (const row of knowledgeItemRows) {
      const createdAtMs = parseTimestamp(row.createdAt);

      if (createdAtMs === null) {
        continue;
      }

      const dateKey = getUtcDateKey(createdAtMs);
      knowledgeItemCreatedCounts.set(dateKey, (knowledgeItemCreatedCounts.get(dateKey) ?? 0) + 1);
    }

    const totalUsers = userRows.filter((row) => isUserVisibleAt(row, today.endMs)).length;
    const activeUsers7d = new Set(
      sessionActivityRows
        .filter((row) => row.activityAtMs >= today.startMs - (ACTIVE_USERS_WINDOW_DAYS - 1) * MILLISECONDS_PER_DAY)
        .filter((row) => row.activityAtMs <= today.endMs)
        .filter((row) => {
          const sessionUser = userById.get(row.userId);
          return sessionUser ? isUserVisibleAt(sessionUser, today.endMs) : false;
        })
        .map((row) => row.userId),
    ).size;

    const firstTrendDate = trendDays[0]?.date ?? today.date;
    let cumulativeRolePlaySessionsCompleted = sumCountsBeforeDate(completedRolePlayCounts, firstTrendDate);
    let cumulativeFreeFormSessionsCompleted = sumCountsBeforeDate(completedFreeFormCounts, firstTrendDate);

    const usageTrend = trendDays.map((day) => {
      const activeWindowStartMs = day.startMs - (ACTIVE_USERS_WINDOW_DAYS - 1) * MILLISECONDS_PER_DAY;
      const visibleUsersCount = userRows.filter((row) => isUserVisibleAt(row, day.endMs)).length;
      const activeUsersInWindow = new Set(
        sessionActivityRows
          .filter((row) => row.activityAtMs >= activeWindowStartMs && row.activityAtMs <= day.endMs)
          .filter((row) => {
            const sessionUser = userById.get(row.userId);
            return sessionUser ? isUserVisibleAt(sessionUser, day.endMs) : false;
          })
          .map((row) => row.userId),
      ).size;

      cumulativeRolePlaySessionsCompleted += completedRolePlayCounts.get(day.date) ?? 0;
      cumulativeFreeFormSessionsCompleted += completedFreeFormCounts.get(day.date) ?? 0;

      return {
        activeUsers7d: activeUsersInWindow,
        date: day.date,
        freeFormSessionsCompleted: cumulativeFreeFormSessionsCompleted,
        rolePlaySessionsCompleted: cumulativeRolePlaySessionsCompleted,
        totalUsers: visibleUsersCount,
      };
    });

    const contentTrend = trendDays.map((day) => ({
      date: day.date,
      knowledgeItemsCreated: knowledgeItemCreatedCounts.get(day.date) ?? 0,
      scenariosCreated: scenarioCreatedCounts.get(day.date) ?? 0,
    }));

    return context.json(
      adminDashboardResponseSchema.parse({
        contentTrend,
        summary: {
          activeUsers7d,
          freeFormSessionsCompleted: completedFreeFormCounts.size
            ? [...completedFreeFormCounts.values()].reduce((sum, count) => sum + count, 0)
            : 0,
          knowledgeItemsCreated: knowledgeItemRows.length,
          rolePlaySessionsCompleted: completedRolePlayCounts.size
            ? [...completedRolePlayCounts.values()].reduce((sum, count) => sum + count, 0)
            : 0,
          scenariosCreated: scenarioRows.length,
          totalUsers,
        },
        usageTrend,
      }),
    );
  });
}
