import { adminDashboardResponseSchema, studentDashboardResponseSchema } from "@english-coach/contract/common";
import dayjs from "dayjs";
import type { z } from "zod";
import { apiClient } from "@/lib/axios";
import type {
  AdminDashboardContentTrendView,
  AdminDashboardMetricCardView,
  AdminDashboardOverviewView,
  AdminDashboardTotals,
  AdminDashboardUsageTrendView,
  StudentDashboardMetricCardView,
  StudentDashboardSummary,
  StudentDashboardTotals,
  StudentDashboardTrendPoint,
} from "./types";

const ADMIN_DASHBOARD_ENDPOINT = "/api/admin/dashboard";
const STUDENT_DASHBOARD_ENDPOINT = "/api/student/dashboard";
const DASHBOARD_TREND_DAYS = 21;

function formatMetricValue(key: StudentDashboardMetricCardView["key"], value: number) {
  if (key === "practiceMinutes") {
    return `${value.toLocaleString()} min`;
  }

  return value.toLocaleString();
}

function formatAdminMetricValue(value: number) {
  return value.toLocaleString();
}

function createAdminMetricCards(totals: AdminDashboardTotals): AdminDashboardMetricCardView[] {
  const metricConfigs: Array<{
    helperText: string;
    key: AdminDashboardMetricCardView["key"];
    label: string;
    value: number;
  }> = [
    {
      helperText: "All accounts currently visible to the admin API.",
      key: "totalUsers",
      label: "Total users",
      value: totals.totalUsers,
    },
    {
      helperText: "Users active during the trailing 7-day window.",
      key: "activeUsers7d",
      label: "Active users, 7d",
      value: totals.activeUsers7d,
    },
    {
      helperText: "Completed guided role-play sessions counted by the backend aggregate.",
      key: "rolePlaySessionsCompleted",
      label: "Role-play sessions",
      value: totals.rolePlaySessionsCompleted,
    },
    {
      helperText: "Completed free-form sessions counted by the backend aggregate.",
      key: "freeFormSessionsCompleted",
      label: "Free-form sessions",
      value: totals.freeFormSessionsCompleted,
    },
    {
      helperText: "Scenarios created across the app.",
      key: "scenariosCreated",
      label: "Scenarios created",
      value: totals.scenariosCreated,
    },
    {
      helperText: "Knowledge items created across the app.",
      key: "knowledgeItemsCreated",
      label: "Knowledge items created",
      value: totals.knowledgeItemsCreated,
    },
  ];

  return metricConfigs.map((metric) => ({
    helperText: metric.helperText,
    key: metric.key,
    label: metric.label,
    value: formatAdminMetricValue(metric.value),
  }));
}

function mapAdminUsageTrend(
  points: z.infer<typeof adminDashboardResponseSchema>["usageTrend"],
): AdminDashboardUsageTrendView[] {
  return points.map((point) => ({
    activeUsers7d: point.activeUsers7d,
    date: point.date,
    freeFormSessionsCompleted: point.freeFormSessionsCompleted,
    label: dayjs(point.date).format("MM-DD"),
    rolePlaySessionsCompleted: point.rolePlaySessionsCompleted,
    totalUsers: point.totalUsers,
  }));
}

function mapAdminContentTrend(
  points: z.infer<typeof adminDashboardResponseSchema>["contentTrend"],
): AdminDashboardContentTrendView[] {
  return points.map((point) => ({
    date: point.date,
    knowledgeItemsCreated: point.knowledgeItemsCreated,
    label: dayjs(point.date).format("MM-DD"),
    scenariosCreated: point.scenariosCreated,
  }));
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

export async function fetchStudentDashboardSummary(): Promise<StudentDashboardSummary> {
  const response = await apiClient.get(STUDENT_DASHBOARD_ENDPOINT);
  const data = studentDashboardResponseSchema.parse(response.data);
  const trends = data.trends.map((trend) => ({
    ...trend,
    label: dayjs(trend.date).format("MM-DD"),
  }));

  return {
    metrics: createMetricCards(data.totals, trends),
    totals: data.totals,
    trends,
  };
}

export async function fetchAdminDashboardOverview(): Promise<AdminDashboardOverviewView> {
  const response = await apiClient.get(ADMIN_DASHBOARD_ENDPOINT);
  const data = adminDashboardResponseSchema.parse(response.data);

  return {
    contentTrend: mapAdminContentTrend(data.contentTrend),
    metrics: createAdminMetricCards(data.summary),
    totals: data.summary,
    usageTrend: mapAdminUsageTrend(data.usageTrend),
  };
}
