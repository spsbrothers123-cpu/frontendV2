import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import { formatCurrency } from "../ui/MiniChart";
import { useConsolidation } from "./ConsolidationContext";
import { fmtCompact, fmtNum } from "./format";
import type { ConsolidationShop, SalesTrendPoint } from "../../types/consolidation";

const AXIS = { fontSize: 11, fill: "#6B6459" };
const TOOLTIP = { borderRadius: 12, border: "1px solid #23231A14", fontSize: 13 };

export interface BarDatum {
  id: string;
  name: string;
  value: number;
}

/** One bar per shop, coloured with that shop's colour everywhere in the module. */
export function ShopBarChart({
  data,
  valueLabel,
  money = true,
  height = 240,
}: {
  data: BarDatum[];
  valueLabel: string;
  money?: boolean;
  height?: number;
}) {
  const { shopColor } = useConsolidation();
  return (
    <div style={{ height }} role="img" aria-label={`${valueLabel} by shop`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#23231A0F" />
          <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} tickFormatter={fmtCompact} />
          <Tooltip
            cursor={{ fill: "#23231A08" }}
            formatter={(v) => [money ? formatCurrency(Number(v ?? 0)) : fmtNum(Number(v ?? 0)), valueLabel]}
            contentStyle={TOOLTIP}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {data.map((d) => (
              <Cell key={d.id} fill={shopColor(d.id)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Date-wise trend, one line per shop in scope. */
export function ShopTrendChart({
  points,
  shops,
  height = 260,
}: {
  points: SalesTrendPoint[];
  shops: ConsolidationShop[];
  height?: number;
}) {
  const { shopColor } = useConsolidation();
  const data = points.map((p) => ({ label: p.label, ...p.perShop }));
  return (
    <div style={{ height }} role="img" aria-label="Sales trend by shop">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#23231A0F" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} tickFormatter={fmtCompact} />
          <Tooltip formatter={(v, name) => [formatCurrency(Number(v ?? 0)), String(name)]} contentStyle={TOOLTIP} />
          {shops.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {shops.map((s) => (
            <Line key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={shopColor(s.id)} strokeWidth={2} dot={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Date-wise totals (purchases / expenses). */
export function DateBarChart({
  data,
  valueLabel,
  color = "#F0B429",
  height = 240,
}: {
  data: { label: string; total: number }[];
  valueLabel: string;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`${valueLabel} by date`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#23231A0F" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} tickFormatter={fmtCompact} />
          <Tooltip cursor={{ fill: "#23231A08" }} formatter={(v) => [formatCurrency(Number(v ?? 0)), valueLabel]} contentStyle={TOOLTIP} />
          <Bar dataKey="total" fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
