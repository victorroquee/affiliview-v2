import React from "react";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "orange" | "red" | "";
  trend?: string;
  trendDir?: "up" | "down";
}

const KPICard: React.FC<KPICardProps> = ({
  icon: Icon,
  label,
  value,
  sub,
  color = "",
  trend,
  trendDir = "up",
}) => {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-card-icon">
          <Icon size={14} strokeWidth={1.4} />
        </div>
      </div>
      <div className={`kpi-card-value${color ? ` ${color}` : ""}`}>{value}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
      {trend && (
        <div className={`kpi-trend ${trendDir}`}>
          {trendDir === "up" ? "↑" : "↓"} {trend}
        </div>
      )}
    </div>
  );
};

export default KPICard;
