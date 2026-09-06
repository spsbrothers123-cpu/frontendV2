import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { SalesPoint, BreakdownSlice } from "../../types";

export function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function MiniAreaChart({
  data,
  color = "#F0B429",
  valueLabel = "Value",
  height = 220,
}: {
  data: SalesPoint[];
  color?: string;
  valueLabel?: string;
  height?: number;
}) {
  const gradientId = `fill-${valueLabel.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#23231A0F" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6459" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#6B6459" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip
            formatter={(v) => [formatCurrency(Number(v ?? 0)), valueLabel]}
            contentStyle={{ borderRadius: 12, border: "1px solid #23231A14", fontSize: 13 }}
          />
          <Area type="monotone" dataKey="value" stroke="#231F1A" strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const barColors = ["#F0B429", "#5C6B2C", "#C87F0A", "#C15B4A", "#6B6459"];

export function BreakdownBars({ slices, formatValue }: { slices: BreakdownSlice[]; formatValue?: (v: number) => string }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const fmt = formatValue ?? formatCurrency;
  return (
    <div className="space-y-3">
      {slices.map((slice, i) => {
        const pct = Math.round((slice.value / total) * 100);
        return (
          <div key={slice.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-charcoal font-medium truncate">{slice.label}</span>
              <span className="text-charcoal-muted shrink-0 ml-2">{fmt(slice.value)} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-charcoal/6 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-250"
                style={{ width: `${pct}%`, backgroundColor: barColors[i % barColors.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
