import React from "react";
import type { LucideIcon } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "yellow" | "";
  info?: string;
  onClick?: () => void;
}

/** Card "herói" — número grande e visual, para as métricas-chave do topo. */
const HeroStat: React.FC<Props> = ({ icon: Icon, label, value, sub, color = "", info, onClick }) => (
  <div className={`hero-stat${onClick ? " clickable" : ""}`} onClick={onClick}>
    <div className="hero-stat-top">
      <div className="hero-stat-icon"><Icon size={15} strokeWidth={1.6} /></div>
      <span className="hero-stat-label">
        {label}
        {info && <InfoTooltip text={info} />}
      </span>
    </div>
    <div className={`hero-stat-value${color ? ` ${color}` : ""}`}>{value}</div>
    {sub && <div className="hero-stat-sub">{sub}</div>}
  </div>
);

export default HeroStat;
