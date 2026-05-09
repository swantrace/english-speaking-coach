import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChartCard } from "@/components/charts/line-chart-card";
import type { AdminAiRequestStatsView } from "./types";

interface AiRequestStatsProps {
  stats: AdminAiRequestStatsView;
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";
}

export function AiRequestStats({ stats }: AiRequestStatsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.metrics.map((metric) => (
          <article className="rounded-[0.5rem] border border-stone-200 bg-white p-5 shadow-sm" key={metric.key}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{metric.label}</p>
            <p className="mt-3 text-2xl text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{metric.helperText}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <LineChartCard
          description="Daily token volume and request count across the selected filters."
          title="Token trend"
        >
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={stats.trend} margin={{ bottom: 0, left: 0, right: 12, top: 8 }}>
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#78716c" tickLine={false} />
              <YAxis stroke="#78716c" tickFormatter={(value) => Number(value).toLocaleString()} tickLine={false} />
              <Tooltip formatter={(value) => Number(value).toLocaleString()} />
              <Line
                dataKey="totalTokens"
                dot={false}
                name="Tokens"
                stroke="#0f172a"
                strokeLinecap="round"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="requests"
                dot={false}
                name="Requests"
                stroke="#0f766e"
                strokeLinecap="round"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </LineChartCard>

        <LineChartCard description="The highest token consumers by operation." title="Tokens by operation">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={stats.byOperation} layout="vertical" margin={{ bottom: 0, left: 12, right: 12, top: 8 }}>
              <CartesianGrid horizontal={false} stroke="#e7e5e4" />
              <XAxis stroke="#78716c" tickFormatter={(value) => Number(value).toLocaleString()} type="number" />
              <YAxis
                dataKey="label"
                stroke="#78716c"
                tickFormatter={(value) => String(value).slice(0, 24)}
                type="category"
                width={150}
              />
              <Tooltip formatter={(value) => Number(value).toLocaleString()} />
              <Bar dataKey="tokenUsage.totalTokens" fill="#0f172a" name="Tokens" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </LineChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {[
          { items: stats.byModel, title: "Models" },
          { items: stats.byOperation, title: "Operations" },
        ].map((group) => (
          <div className="rounded-[0.5rem] border border-stone-200 bg-white shadow-sm" key={group.title}>
            <div className="border-b border-stone-200 px-5 py-4">
              <h3 className="text-base text-slate-950">{group.title}</h3>
            </div>
            <div className="divide-y divide-stone-200">
              {group.items.length > 0 ? (
                group.items.map((item) => (
                  <div className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto]" key={item.key}>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-slate-950">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.requests.toLocaleString()} requests</p>
                    </div>
                    <p className="text-sm text-slate-700">{formatNumber(item.tokenUsage.totalTokens)} tokens</p>
                    <p className="text-sm text-red-700">{item.failedRequests.toLocaleString()} failed</p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-600">No grouped usage data is available yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
