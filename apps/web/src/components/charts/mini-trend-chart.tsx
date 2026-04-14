import { Line, LineChart, ResponsiveContainer } from "recharts";

interface MiniTrendPoint {
  value: number;
}

interface MiniTrendChartProps {
  data: MiniTrendPoint[];
  color?: string;
}

export function MiniTrendChart({ data, color = "#6b7280" }: MiniTrendChartProps) {
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data}>
          <Line
            dataKey="value"
            dot={false}
            isAnimationActive={false}
            stroke={color}
            strokeLinecap="round"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
