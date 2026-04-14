import { MetricCard } from "@/components/app/metric-card";
import type { StudentDashboardMetricCardView } from "../types";

const accentClassNames = ["bg-amber-300", "bg-sky-300", "bg-emerald-300", "bg-rose-300"] as const;

interface StudentMetricsProps {
  metrics: StudentDashboardMetricCardView[];
}

export function StudentMetrics({ metrics }: StudentMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard
          accentClassName={accentClassNames[index % accentClassNames.length]}
          helperText={metric.helperText}
          key={metric.key}
          label={metric.label}
          value={metric.value}
        />
      ))}
    </div>
  );
}
