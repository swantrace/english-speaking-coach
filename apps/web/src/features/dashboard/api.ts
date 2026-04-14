import {
  historyDetailResponseSchema,
  historyListResponseSchema,
  knowledgePointListResponseSchema,
} from "@english-coach/contract";
import dayjs from "dayjs";
import type { z } from "zod";
import { apiClient } from "@/lib/axios";
import type {
  StudentDashboardMetricCardView,
  StudentDashboardSummary,
  StudentDashboardTotals,
  StudentDashboardTrendPoint,
} from "./types";

const HISTORY_ENDPOINT = "/api/history";
const KNOWLEDGE_POINTS_ENDPOINT = "/api/knowledge-points";
const HISTORY_PAGE_SIZE = 100;
const DASHBOARD_TREND_DAYS = 21;

type HistoryListResponse = z.infer<typeof historyListResponseSchema>;
type HistorySummary = HistoryListResponse["items"][number];
type HistoryDetailResponse = z.infer<typeof historyDetailResponseSchema>;
function formatMetricValue(key: StudentDashboardMetricCardView["key"], value: number) {
  if (key === "practiceMinutes") {
    return `${value.toLocaleString()} min`;
  }

  return value.toLocaleString();
}

function createTrendSeries() {
  return Array.from({ length: DASHBOARD_TREND_DAYS }, (_, index) => {
    const day = dayjs()
      .startOf("day")
      .subtract(DASHBOARD_TREND_DAYS - index - 1, "day");

    return {
      date: day.format("YYYY-MM-DD"),
      label: day.format("MMM D"),
      freeFormSessionsCompleted: 0,
      knowledgeItemsLearned: 0,
      practiceMinutes: 0,
      rolePlaySessionsCompleted: 0,
    } satisfies StudentDashboardTrendPoint;
  });
}

function getSessionDurationMinutes(session: HistorySummary) {
  if (!session.endedAt) {
    return 0;
  }

  const minutes = dayjs(session.endedAt).diff(dayjs(session.startedAt), "minute", true);

  return Math.max(0, Math.round(minutes));
}

function getSessionDayKey(session: Pick<HistorySummary, "endedAt" | "startedAt">) {
  return dayjs(session.endedAt ?? session.startedAt).format("YYYY-MM-DD");
}

function createMetricCards(totals: StudentDashboardTotals, trends: StudentDashboardTrendPoint[]) {
  const recentPracticeMinutes = trends.reduce((sum, point) => sum + point.practiceMinutes, 0);
  const recentRolePlaySessions = trends.reduce((sum, point) => sum + point.rolePlaySessionsCompleted, 0);
  const recentFreeFormSessions = trends.reduce((sum, point) => sum + point.freeFormSessionsCompleted, 0);
  const recentKnowledgeItems = trends.reduce((sum, point) => sum + point.knowledgeItemsLearned, 0);

  const metricConfigs: Array<{
    helperText: string;
    key: StudentDashboardMetricCardView["key"];
    label: string;
    value: number;
  }> = [
    {
      helperText: `${recentPracticeMinutes.toLocaleString()} min in the last ${DASHBOARD_TREND_DAYS} days`,
      key: "practiceMinutes",
      label: "Total practice minutes",
      value: totals.practiceMinutes,
    },
    {
      helperText: `${recentRolePlaySessions.toLocaleString()} role-play sessions in the last ${DASHBOARD_TREND_DAYS} days`,
      key: "rolePlaySessionsCompleted",
      label: "Role-play sessions completed",
      value: totals.rolePlaySessionsCompleted,
    },
    {
      helperText: `${recentFreeFormSessions.toLocaleString()} free-form sessions in the last ${DASHBOARD_TREND_DAYS} days`,
      key: "freeFormSessionsCompleted",
      label: "Free-form sessions completed",
      value: totals.freeFormSessionsCompleted,
    },
    {
      helperText: `${recentKnowledgeItems.toLocaleString()} newly observed items in the last ${DASHBOARD_TREND_DAYS} days`,
      key: "knowledgeItemsLearned",
      label: "Knowledge items learned",
      value: totals.knowledgeItemsLearned,
    },
  ];

  return metricConfigs.map((metric) => ({
    helperText: metric.helperText,
    key: metric.key,
    label: metric.label,
    value: formatMetricValue(metric.key, metric.value),
  }));
}

async function fetchHistoryPage(page: number) {
  const response = await apiClient.get(HISTORY_ENDPOINT, {
    params: {
      page,
      pageSize: HISTORY_PAGE_SIZE,
      sortBy: "endedAt",
      sortDirection: "desc",
    },
  });

  return historyListResponseSchema.parse(response.data);
}

async function fetchAllHistorySummaries() {
  const items: HistorySummary[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const pageResponse = await fetchHistoryPage(page);
    items.push(...pageResponse.items);
    totalPages = pageResponse.totalPages;
    page += 1;
  }

  return items;
}

async function fetchHistoryDetails(sessionIds: string[]) {
  const responses = await Promise.all(
    sessionIds.map(async (sessionId) => {
      const response = await apiClient.get(`${HISTORY_ENDPOINT}/${sessionId}`);
      return historyDetailResponseSchema.parse(response.data);
    }),
  );

  return responses;
}

async function fetchKnowledgePointTotal() {
  const response = await apiClient.get(KNOWLEDGE_POINTS_ENDPOINT, {
    params: {
      page: 1,
      pageSize: 1,
    },
  });

  const data = knowledgePointListResponseSchema.parse(response.data);

  return data.total;
}

function applySessionTrendPoints(trends: StudentDashboardTrendPoint[], sessions: HistorySummary[]) {
  const trendMap = new Map(trends.map((trend) => [trend.date, trend]));

  for (const session of sessions) {
    const trendPoint = trendMap.get(getSessionDayKey(session));

    if (!trendPoint) {
      continue;
    }

    trendPoint.practiceMinutes += getSessionDurationMinutes(session);

    if (session.sessionType === "role-play") {
      trendPoint.rolePlaySessionsCompleted += 1;
      continue;
    }

    trendPoint.freeFormSessionsCompleted += 1;
  }
}

function applyKnowledgeTrendPoints(
  trends: StudentDashboardTrendPoint[],
  sessions: HistorySummary[],
  details: HistoryDetailResponse[],
) {
  const trendMap = new Map(trends.map((trend) => [trend.date, trend]));
  const detailBySessionId = new Map(details.map((detail) => [detail.session.id, detail]));
  const seenKnowledgeItemIds = new Set<string>();
  const sessionsAscending = [...sessions].sort(
    (left, right) => dayjs(left.startedAt).valueOf() - dayjs(right.startedAt).valueOf(),
  );

  for (const session of sessionsAscending) {
    const detail = detailBySessionId.get(session.id);

    if (!detail) {
      continue;
    }

    const trendPoint = trendMap.get(getSessionDayKey(session));

    if (!trendPoint) {
      continue;
    }

    let newlyLearnedCount = 0;
    const uniqueKnowledgeItemIds = [...new Set(detail.knowledgeItems.map((item) => item.knowledgeItemId))];

    for (const knowledgeItemId of uniqueKnowledgeItemIds) {
      if (seenKnowledgeItemIds.has(knowledgeItemId)) {
        continue;
      }

      seenKnowledgeItemIds.add(knowledgeItemId);
      newlyLearnedCount += 1;
    }

    trendPoint.knowledgeItemsLearned += newlyLearnedCount;
  }
}

export async function fetchStudentDashboardSummary(): Promise<StudentDashboardSummary> {
  // TODO: swap this composition layer for a dedicated GET /api/student/dashboard endpoint when the backend aggregate is available.
  const [historySummaries, knowledgeItemsLearned] = await Promise.all([
    fetchAllHistorySummaries(),
    fetchKnowledgePointTotal(),
  ]);
  const trendSeries = createTrendSeries();
  const trendStartDate = dayjs(trendSeries[0]?.date).startOf("day");
  const recentSessions = historySummaries.filter((session) =>
    dayjs(session.endedAt ?? session.startedAt).isAfter(trendStartDate.subtract(1, "day")),
  );
  const recentSessionDetails =
    recentSessions.length > 0 ? await fetchHistoryDetails(recentSessions.map((session) => session.id)) : [];

  applySessionTrendPoints(trendSeries, recentSessions);
  applyKnowledgeTrendPoints(trendSeries, recentSessions, recentSessionDetails);

  const totals: StudentDashboardTotals = {
    freeFormSessionsCompleted: historySummaries.filter((session) => session.sessionType === "free-form").length,
    knowledgeItemsLearned,
    practiceMinutes: historySummaries.reduce((sum, session) => sum + getSessionDurationMinutes(session), 0),
    rolePlaySessionsCompleted: historySummaries.filter((session) => session.sessionType === "role-play").length,
  };

  return {
    metrics: createMetricCards(totals, trendSeries),
    totals,
    trends: trendSeries,
  };
}
