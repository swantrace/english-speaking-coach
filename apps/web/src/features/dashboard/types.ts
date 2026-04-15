export type StudentDashboardMetricKey =
  | "practiceMinutes"
  | "rolePlaySessionsCompleted"
  | "freeFormSessionsCompleted"
  | "knowledgeItemsLearned";

export interface StudentDashboardTotals {
  practiceMinutes: number;
  rolePlaySessionsCompleted: number;
  freeFormSessionsCompleted: number;
  knowledgeItemsLearned: number;
}

export interface StudentDashboardTrendPoint {
  date: string;
  label: string;
  freeFormSessionsCompleted: number;
  knowledgeItemsLearned: number;
  practiceMinutes: number;
  rolePlaySessionsCompleted: number;
}

export interface StudentDashboardMetricCardView {
  key: StudentDashboardMetricKey;
  label: string;
  helperText: string;
  value: string;
}

export interface StudentDashboardSummary {
  metrics: StudentDashboardMetricCardView[];
  totals: StudentDashboardTotals;
  trends: StudentDashboardTrendPoint[];
}

export type AdminDashboardMetricKey =
  | "totalUsers"
  | "activeUsers7d"
  | "rolePlaySessionsCompleted"
  | "freeFormSessionsCompleted"
  | "scenariosCreated"
  | "knowledgeItemsCreated";

export interface AdminDashboardTotals {
  totalUsers: number;
  activeUsers7d: number;
  rolePlaySessionsCompleted: number;
  freeFormSessionsCompleted: number;
  scenariosCreated: number;
  knowledgeItemsCreated: number;
}

export interface AdminDashboardMetricCardView {
  key: AdminDashboardMetricKey;
  label: string;
  helperText: string;
  value: string;
}

export interface AdminDashboardUsageTrendView {
  date: string;
  label: string;
  totalUsers: number;
  activeUsers7d: number;
  rolePlaySessionsCompleted: number;
  freeFormSessionsCompleted: number;
}

export interface AdminDashboardContentTrendView {
  date: string;
  label: string;
  scenariosCreated: number;
  knowledgeItemsCreated: number;
}

export interface AdminDashboardOverviewView {
  metrics: AdminDashboardMetricCardView[];
  totals: AdminDashboardTotals;
  usageTrend: AdminDashboardUsageTrendView[];
  contentTrend: AdminDashboardContentTrendView[];
}
