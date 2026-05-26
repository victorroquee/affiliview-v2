import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── OG Group Colors ───────────────────────────────
const GREEN   = "#15803D";
const COLORS  = ["#15803D", "#1D4ED8", "#7C3AED", "#B45309", "#C92A2A"];

export const PRODUCT_COLORS: Record<string, string> = {
  "Slimjara":    "#15803D",
  "LipoGandha":  "#B45309",
  "Liposkin":    "#0891B2",
  "Erectus":     "#1D4ED8",
  "Memoguard":   "#7C3AED",
};

const REFUND_COLORS: Record<string, string> = {
  Slimjara:    "#15803D",
  LipoGandha:  "#B45309",
  Liposkin:    "#0891B2",
  Erectus:     "#1D4ED8",
  Memoguard:   "#7C3AED",
};

// ─── Custom Tooltip ────────────────────────────────
interface TooltipPayload {
  value: number;
  payload: { date: string };
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--banner-bg)",
          borderRadius: "var(--radius)",
          padding: "10px 14px",
          fontSize: 12,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 4 }}>
          {payload[0].payload.date}
        </div>
        <div
          style={{
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.4px",
          }}
        >
          €{payload[0].value.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
        </div>
      </div>
    );
  }
  return null;
};

// ─── Gross Evolution Area Chart ────────────────────
interface DailyData {
  date: string;
  value: number;
}

export const GrossEvolutionChart: React.FC<{ data: DailyData[]; periodDays?: number }> = ({
  data,
  periodDays,
}) => {
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.split("-").slice(1).join("/"),
  }));

  const diasLabel = periodDays ?? data.length;

  return (
    <div className="chart-card">
      <div className="chart-card-title">Evolução Diária de Gross — {diasLabel} dias</div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="og-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={GREEN} stopOpacity={0.10} />
              <stop offset="95%" stopColor={GREEN} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 3"
            stroke="#E5E8EE"
            strokeWidth={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9299A8", fontSize: 9 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9299A8", fontSize: 9 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v.toFixed(0)}`
            }
            width={46}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={GREEN}
            strokeWidth={1.5}
            fill="url(#og-fill)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Product Mix Donut Chart ──────────────────────
interface MixData {
  name: string;
  value: number;
}

const PieTooltipStyle = {
  background: "#091A0F",
  border: "none",
  borderRadius: "8px",
  fontSize: 12,
  color: "#fff",
} as React.CSSProperties;

export const ProductMixChart: React.FC<{ data: MixData[] }> = ({ data }) => {
  return (
    <div className="chart-card">
      <div className="chart-card-title">
        Mix por Produto — {data.length > 0 ? `${data.length} produtos` : ""}
      </div>
      <div className="chart-card-subtitle">
        Distribuição de receita ({data.map((d) => d.name).join(" / ")})
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            animationDuration={800}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={PRODUCT_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            formatter={(value: string) => (
              <span style={{ color: "#4A5165", fontSize: 11 }}>{value}</span>
            )}
          />
          <Tooltip
            formatter={(value) => [
              `€${Number(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
              "Gross",
            ]}
            contentStyle={PieTooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Refund by Product Bar ────────────────────────
interface RefundData {
  name: string;
  refundPct: number;
}

export const RefundByProductChart: React.FC<{ data: RefundData[] }> = ({ data }) => {
  const maxPct = Math.max(...data.map((d) => d.refundPct), 1);

  return (
    <div>
      <div className="chart-card-title" style={{ marginBottom: 4 }}>
        Refund + CB por Produto (%) —{" "}
        {data.length > 0 ? `${data.length} produto${data.length !== 1 ? "s" : ""}` : ""}
      </div>
      <div className="chart-card-subtitle" style={{ marginBottom: 16 }}>
        gross reembolsos + CB ÷ gross revenue frontal
      </div>
      {data.map((d) => (
        <div className="h-bar-container" key={d.name}>
          <div className="h-bar-label">
            <span className="h-bar-name">{d.name}</span>
            <span className="h-bar-value">{d.refundPct.toFixed(1)}%</span>
          </div>
          <div className="h-bar-track">
            <div
              className="h-bar-fill"
              style={{
                width: `${(d.refundPct / maxPct) * 100}%`,
                background: REFUND_COLORS[d.name] ?? "#B45309",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
