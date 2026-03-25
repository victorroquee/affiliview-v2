import React from "react";
import type { VariantResult } from "../../lib/cpa/types";

const STATUS_CONFIG: Record<
  VariantResult["cpaStatus"],
  { label: string; bg: string; color: string }
> = {
  increase: { label: "↑ Pode aumentar",    bg: "var(--green-bg)",  color: "var(--green-text)" },
  ok:       { label: "✓ Dentro do limite", bg: "var(--blue-bg)",   color: "var(--blue)" },
  reduce:   { label: "↓ Reduzir CPA",      bg: "var(--red-bg)",    color: "var(--red)" },
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
        borderRadius: "20px",
        background: cfg.bg,
        color: cfg.color,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
