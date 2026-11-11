"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ACCENT = "var(--accent)";
const ACCENT2 = "#405B44";
const MUTED = "color-mix(in oklab, var(--muted-foreground) 28%, transparent)";

export function SparkArea({
  data,
  dataKey = "v",
  height = 72,
}: {
  data: Array<Record<string, number | string>>;
  dataKey?: string;
  height?: number;
}) {
  const gid = `hdSpark-${useId().replace(/:/g, "")}`;
  if (!data.length) return null;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "var(--card-solid)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={ACCENT}
            fill={`url(#${gid})`}
            strokeWidth={2}
            isAnimationActive
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SparkBars({
  data,
  dataKey = "v",
  height = 88,
}: {
  data: Array<Record<string, number | string>>;
  dataKey?: string;
  height?: number;
}) {
  if (!data.length) return null;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="t" hide />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "var(--card-solid)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar dataKey={dataKey} radius={[6, 6, 2, 2]} isAnimationActive animationDuration={800}>
            {data.map((_, i) => (
              <Cell key={i} fill={i % 2 === 0 ? ACCENT : ACCENT2} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({
  value,
  label,
  size = 108,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  const data = [
    { name: "used", value: v },
    { name: "free", value: 100 - v },
  ];
  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="68%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive
            animationDuration={700}
          >
            <Cell fill={ACCENT} />
            <Cell fill={MUTED} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-value text-lg font-semibold text-foreground">{Math.round(v)}%</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
