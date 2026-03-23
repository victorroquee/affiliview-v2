import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Colors ────────────────────────────────────────
const GREEN = "#00E898";
const COLORS = ["#00E898", "#4A95FF", "#9F60FF", "#F5A520", "#FF3B56"];
const REFUND_COLORS: Record<string, string> = {
  Slimjara: "#F5A520",
  "Erectus X": "#FF3B56",
  Memoguard: "#9F60FF",
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
          background: "#10141F",
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
        }}
      >
        <div style={{ color: "#5C7085", fontSize: 11, marginBottom: 4 }}>
          {payload[0].payload.date}
        </div>
        <div style={{ color: GREEN, fontWeight: 700, fontSize: 16, fontFamily: "'Space Mono', monospace" }}>
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

  // periodDays = duração real do período; data.length = apenas dias com transações
  const diasLabel = periodDays ?? data.length;

  return (
    <div className="chart-card">
      <div className="chart-card-title">Evolução Diária de Gross — {diasLabel} dias</div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.4} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#5C7085", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#5C7085", fontSize: 11 }}
            tickFormatter={(v: number) =>
              `€${(v / 1000).toFixed(0)}k`
            }
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={GREEN}
            strokeWidth={2.5}
            fill="url(#grossGradient)"
            animationDuration={1200}
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

export const ProductMixChart: React.FC<{ data: MixData[] }> = ({ data }) => {
  return (
    <div className="chart-card">
      <div className="chart-card-title">Mix por Produto — {data.length > 0 ? `${data.length} produtos` : ""}</div>
      <div className="chart-card-subtitle">
        Distribuição de receita ({data.map((d) => d.name).join(" / ")})
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            animationDuration={1000}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            formatter={(value: string) => (
              <span style={{ color: "#5C7085", fontSize: 12 }}>{value}</span>
            )}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any) => [
              `€${Number(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
              "Gross",
            ]) as any}
            contentStyle={{
              background: "#10141F",
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 8,
              fontSize: 13,
            }}
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

export const RefundByProductChart: React.FC<{ data: RefundData[] }> = ({
  data,
}) => {
  const maxPct = Math.max(...data.map((d) => d.refundPct), 1);

  return (
    <div>
      <div className="chart-card-title" style={{ marginBottom: 4 }}>
        Refund + CB por Produto (%) — {data.length > 0 ? `${data.length} produto${data.length !== 1 ? "s" : ""}` : ""}
      </div>
      <div className="chart-card-subtitle" style={{ marginBottom: 16 }}>
        Ponderado por gross
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
                background: REFUND_COLORS[d.name] || "#f59e0b",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
