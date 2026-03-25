import React from "react";
import type { VariantResult } from "../../lib/cpa/types";

const STATUS_CONFIG: Record<
  VariantResult["cpaStatus"],
  { label: string; bg: string; color: string }
> = {
  increase: { label: "↑ Pode aumentar",    bg: "#EDFAF3", color: "#0D5C2E" },
  ok:       { label: "✓ Dentro do limite", bg: "#EFF6FF", color: "#1D4ED8" },
  reduce:   { label: "↓ Reduzir CPA",      bg: "#FFF0F0", color: "#C92A2A" },
};

interface StatusBadgeProps {
  status: VariantResult["cpaStatus"];
  compact?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, compact = false }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: compact ? "2px 8px" : "3px 10px",
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
