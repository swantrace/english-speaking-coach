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
