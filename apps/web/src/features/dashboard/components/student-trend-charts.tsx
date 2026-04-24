import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChartCard } from "@/components/charts/line-chart-card";
import type { StudentDashboardTrendPoint } from "../types";

interface StudentTrendChartsProps {
  trends: StudentDashboardTrendPoint[];
}

interface ChartConfig {
  color: string;
  dataKey: keyof Pick<
    StudentDashboardTrendPoint,
    "practiceMinutes" | "rolePlaySessionsCompleted" | "freeFormSessionsCompleted" | "knowledgeItemsLearned"
  >;
  description: string;
  footer: string;
  title: string;
}

const chartConfigs: ChartConfig[] = [
  {
    color: "#d97706",
    dataKey: "practiceMinutes",
    description: "Daily practice time across completed learner sessions.",
    footer: "Minutes per completed session day",
    title: "Practice minutes",
  },
  {
    color: "#0284c7",
    dataKey: "rolePlaySessionsCompleted",
    description: "Role-play sessions completed over the last 21 days.",
    footer: "Completed role-play sessions per day",
    title: "Role-play sessions",
  },
  {
    color: "#059669",
    dataKey: "freeFormSessionsCompleted",
    description: "Free-form speaking sessions completed over the last 21 days.",
    footer: "Completed free-form sessions per day",
    title: "Free-form sessions",
  },
  {
    color: "#e11d48",
    dataKey: "knowledgeItemsLearned",
    description: "Newly observed knowledge items from recent session reviews.",
    footer: "Unique items first seen on each day",
    title: "Knowledge items learned",
  },
];

function getWeeklyTickLabels(trends: StudentDashboardTrendPoint[]) {
  return trends.filter((_, index) => index >= 2 && (index - 2) % 7 === 0).map((trend) => trend.label);
}

function TrendChart({
  color,
  dataKey,
  tickLabels,
  trends,
}: {
  color: string;
  dataKey: ChartConfig["dataKey"];
  tickLabels: string[];
  trends: StudentDashboardTrendPoint[];
}) {
  return (
    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={trends} margin={{ bottom: 8, left: 0, right: 12, top: 8 }}>
        <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={24}
          tickLine={false}
          tick={{ fill: "#78716c", fontSize: 12 }}
          ticks={tickLabels}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#78716c", fontSize: 12 }}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e7e5e4",
            borderRadius: "16px",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          }}
          formatter={(value) => [Number(value ?? 0).toLocaleString(), "Value"]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          dataKey={dataKey}
          dot={false}
          isAnimationActive={false}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StudentTrendCharts({ trends }: StudentTrendChartsProps) {
  const tickLabels = getWeeklyTickLabels(trends);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {chartConfigs.map((chart) => (
        <LineChartCard
          description={chart.description}
          footer={<p className="text-sm text-slate-500">{chart.footer}</p>}
          key={chart.dataKey}
          title={chart.title}
        >
          <TrendChart color={chart.color} dataKey={chart.dataKey} tickLabels={tickLabels} trends={trends} />
        </LineChartCard>
      ))}
    </div>
  );
}
