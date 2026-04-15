import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import type { AdminDashboardContentTrendView, AdminDashboardUsageTrendView } from "../types";

interface AdminTrendChartsProps {
  usageTrend: AdminDashboardUsageTrendView[];
  contentTrend: AdminDashboardContentTrendView[];
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <article className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 space-y-1">
        <h3 className="text-lg text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </article>
  );
}

export function AdminTrendCharts({ usageTrend, contentTrend }: AdminTrendChartsProps) {
  if (usageTrend.length === 0 && contentTrend.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-stone-50/70">
        <DataTableEmpty
          description="The admin dashboard summary is available, but the backend has not exposed trend series for this environment yet."
          title="No trend data available"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {usageTrend.length > 0 ? (
        <ChartCard
          description="Track active users against completed session volume without overloading the first admin slice."
          title="Usage trend"
        >
          <div className="h-80">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={usageTrend} margin={{ bottom: 0, left: -24, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#78716c" tickLine={false} />
                <YAxis allowDecimals={false} stroke="#78716c" tickLine={false} />
                <Tooltip />
                <Legend />
                <Line dataKey="activeUsers7d" name="Active users, 7d" stroke="#0f766e" strokeWidth={2} />
                <Line dataKey="rolePlaySessionsCompleted" name="Role-play" stroke="#4f46e5" strokeWidth={2} />
                <Line dataKey="freeFormSessionsCompleted" name="Free-form" stroke="#0284c7" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : null}

      {contentTrend.length > 0 ? (
        <ChartCard
          description="Keep scenario and knowledge creation visible so future admin content workflows can slot into the same pattern."
          title="Content creation trend"
        >
          <div className="h-80">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={contentTrend} margin={{ bottom: 0, left: -24, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#78716c" tickLine={false} />
                <YAxis allowDecimals={false} stroke="#78716c" tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="scenariosCreated" fill="#fb7185" name="Scenarios" radius={[6, 6, 0, 0]} />
                <Bar dataKey="knowledgeItemsCreated" fill="#f59e0b" name="Knowledge items" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : null}
    </div>
  );
}
