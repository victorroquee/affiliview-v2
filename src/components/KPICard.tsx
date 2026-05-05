import React from "react";
import type { LucideIcon } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  info?: string;
  color?: "green" | "orange" | "red" | "yellow" | "";
  trend?: string;
  trendDir?: "up" | "down";
}

const KPICard: React.FC<KPICardProps> = ({
  icon: Icon,
  label,
  value,
  info,
  color = "",
  trend,
  trendDir = "up",
}) => {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-label">
          {label}
          {info && <InfoTooltip text={info} />}
        </span>
        <div className="kpi-card-icon">
          <Icon size={14} strokeWidth={1.4} />
        </div>
      </div>
      <div className={`kpi-card-value${color ? ` ${color}` : ""}`}>{value}</div>
      {trend && (
        <div className={`kpi-trend ${trendDir}`}>
          {trendDir === "up" ? "↑" : "↓"} {trend}
        </div>
      )}
    </div>
  );
};

export default KPICard;
