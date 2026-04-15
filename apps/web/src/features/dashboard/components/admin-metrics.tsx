import { MetricCard } from "@/components/app/metric-card";
import type { AdminDashboardMetricCardView } from "../types";

interface AdminMetricsProps {
  metrics: AdminDashboardMetricCardView[];
}

const metricAccentClassNames: Record<AdminDashboardMetricCardView["key"], string> = {
  activeUsers7d: "bg-emerald-400",
  freeFormSessionsCompleted: "bg-sky-400",
  knowledgeItemsCreated: "bg-amber-400",
  rolePlaySessionsCompleted: "bg-indigo-400",
  scenariosCreated: "bg-rose-400",
  totalUsers: "bg-slate-400",
};

export function AdminMetrics({ metrics }: AdminMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard
          accentClassName={metricAccentClassNames[metric.key]}
          helperText={metric.helperText}
          key={metric.key}
          label={metric.label}
          value={metric.value}
        />
      ))}
    </div>
  );
}
