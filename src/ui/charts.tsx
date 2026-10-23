/**
 * Charts — Recharts restyled to the ledger system: hairline rules, ink
 * labels, mono figures, green for what you keep, debit red for what's
 * deducted. Every series is fed directly from engine output.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR, formatPercent, shortINR } from "../lib/format";

const INK = "#1B1B18";
const MUTED = "#5C5B52";
const RULE = "#E4E0D4";
const GREEN = "#2F5D50";
const RED = "#A63328";
const OCHRE = "#8A6A1F";

const axisStyle = { fill: MUTED, fontSize: 10.5, fontFamily: "IBM Plex Mono, monospace" };

function LedgerTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v: number) => formatINR(v),
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  labelFormatter?: (l: string | number) => string;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="sheet border px-3 py-2 text-[12px]" style={{ borderColor: INK }}>
      <div className="font-mono text-[10.5px] uppercase tracking-wider text-muted">
        {labelFormatter ? labelFormatter(label ?? "") : label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="mt-1 flex items-baseline gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color ?? GREEN }}
          />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto font-mono tabular-nums text-ink">
            {valueFormatter(p.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Waterfall: CTC → deductions → take-home. Uses a transparent base bar so
 * each deduction "floats" at its position — the ledger posting view.
 */
export function WaterfallChart({
  data,
}: {
  data: { label: string; value: number; kind: "start" | "deduction" | "end" }[];
}) {
  // Build base/visible pairs: running total after each row.
  let running = 0;
  const rows = data.map((d) => {
    if (d.kind === "start") {
      running = d.value;
      return { label: d.label, base: 0, shown: d.value, color: INK, value: d.value };
    }
    if (d.kind === "end") {
      running = d.value;
      return { label: d.label, base: 0, shown: d.value, color: GREEN, value: d.value };
    }
    const next = running + d.value; // d.value is negative
    const row = {
      label: d.label,
      base: Math.min(next, running),
      shown: Math.abs(d.value),
      color: RED,
      value: d.value,
    };
    running = next;
    return row;
  });

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 40 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={RULE} />
          <XAxis
            dataKey="label"
            tick={axisStyle}
            tickLine={false}
            axisLine={{ stroke: RULE }}
            angle={-28}
            textAnchor="end"
            height={56}
            interval={0}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => shortINR(v)}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "rgba(27,27,24,0.04)" }}
            content={<LedgerTooltip />}
          />
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="shown" stackId="w" isAnimationActive={false}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal category bars (budget, tax slabs, comparison). */
export function CategoryBars({
  data,
  color = GREEN,
  stacked,
}: {
  data: { label: string; value: number; color?: string }[];
  color?: string;
  stacked?: boolean;
}) {
  return (
    <div style={{ height: Math.max(160, data.length * 34) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          barCategoryGap="26%"
        >
          <CartesianGrid horizontal={false} stroke={RULE} />
          <XAxis
            type="number"
            tick={axisStyle}
            tickLine={false}
            axisLine={{ stroke: RULE }}
            tickFormatter={(v: number) => shortINR(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ ...axisStyle, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={116}
          />
          <Tooltip cursor={{ fill: "rgba(27,27,24,0.04)" }} content={<LedgerTooltip />} />
          <Bar dataKey="value" isAnimationActive={false} fill={color} stackId={stacked ? "s" : undefined}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two-line donut: allocation by category, ink hairline separators. */
export function Donut({
  data,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number }[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const palette = [GREEN, "#4F7A6B", "#7FA396", OCHRE, "#B09155", "#5C5B52", "#8C8A80", RED];
  const rows = data.filter((d) => d.value > 0);
  return (
    <div className="relative h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={1}
            stroke="#FFFFFF"
            strokeWidth={1.5}
            isAnimationActive={false}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip content={<LedgerTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-[15px] font-medium tabular-nums text-ink">{centerValue}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">{centerLabel}</div>
        </div>
      )}
    </div>
  );
}

/** Growth area chart: invested principal vs projected value. */
export function GrowthArea({
  data,
  xKey = "year",
  investedKey = "invested",
  valueKey = "futureValue",
  xLabel = "Year",
}: {
  data: Array<Record<string, number> | { year: number; invested: number; futureValue: number; gain: number }>;
  xKey?: string;
  investedKey?: string;
  valueKey?: string;
  xLabel?: string;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={RULE} />
          <XAxis
            dataKey={xKey}
            tick={axisStyle}
            tickLine={false}
            axisLine={{ stroke: RULE }}
            label={{
              value: xLabel,
              position: "insideBottomRight",
              offset: -2,
              style: { fill: MUTED, fontSize: 10 },
            }}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => shortINR(v)}
            width={68}
          />
          <Tooltip content={<LedgerTooltip />} />
          <Area
            type="monotone"
            dataKey={investedKey}
            name="Invested"
            stroke={MUTED}
            strokeWidth={1.2}
            strokeDasharray="4 3"
            fill="transparent"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey={valueKey}
            name="Projected value"
            stroke={GREEN}
            strokeWidth={1.8}
            fill="url(#gValue)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Dual line (projected vs required corpus, or regime comparison over income). */
export function DualLine({
  data,
  xKey,
  a,
  b,
  xLabel,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  a: { key: string; name: string; color?: string };
  b?: { key: string; name: string; color?: string };
  xLabel?: string;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={RULE} />
          <XAxis
            dataKey={xKey}
            tick={axisStyle}
            tickLine={false}
            axisLine={{ stroke: RULE }}
            label={{
              value: xLabel,
              position: "insideBottomRight",
              offset: -2,
              style: { fill: MUTED, fontSize: 10 },
            }}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => shortINR(v)}
            width={68}
          />
          <Tooltip content={<LedgerTooltip />} />
          <Line
            type="monotone"
            dataKey={a.key}
            name={a.name}
            stroke={a.color ?? GREEN}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
          {b && (
            <Line
              type="monotone"
              dataKey={b.key}
              name={b.name}
              stroke={b.color ?? RED}
              strokeWidth={1.6}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Principal-vs-interest split bar used for loans. */
export function SplitBar({
  principal,
  interest,
}: {
  principal: number;
  interest: number;
}) {
  const total = principal + interest;
  const pPct = total > 0 ? (principal / total) * 100 : 0;
  const iPct = total > 0 ? (interest / total) * 100 : 0;
  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-[2px] border border-rule">
        <div
          className="flex items-center justify-center bg-ledger text-[10.5px] font-semibold text-paper"
          style={{ width: `${pPct}%` }}
        >
          {pPct > 12 ? `${pPct.toFixed(0)}%` : ""}
        </div>
        <div
          className="flex items-center justify-center bg-debit text-[10.5px] font-semibold text-paper"
          style={{ width: `${iPct}%` }}
        >
          {iPct > 12 ? `${iPct.toFixed(0)}%` : ""}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-ledger" /> Principal {formatINR(principal)} (
          {formatPercent(pPct, 0)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-debit" /> Interest {formatINR(interest)} (
          {formatPercent(iPct, 0)})
        </span>
      </div>
    </div>
  );
}
