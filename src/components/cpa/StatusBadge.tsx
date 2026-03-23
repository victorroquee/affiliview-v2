import React from "react";
import type { VariantResult } from "../../lib/cpa/types";

const STATUS_CONFIG: Record<
  VariantResult["cpaStatus"],
  { label: string; bg: string; color: string; border: string }
> = {
  increase: { label: "↑ Pode aumentar",    bg: "rgba(63,185,80,.10)",  color: "var(--green)", border: "rgba(63,185,80,.25)" },
  ok:       { label: "✓ Dentro do limite", bg: "rgba(88,166,255,.10)", color: "var(--blue)",  border: "rgba(88,166,255,.25)" },
  reduce:   { label: "↓ Reduzir CPA",      bg: "rgba(248,81,73,.10)",  color: "var(--red)",   border: "rgba(248,81,73,.25)" },
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
        borderRadius: 12,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
