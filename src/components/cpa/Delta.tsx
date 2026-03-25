import React from "react";

interface DeltaProps {
  value:    number;
  unit?:    "€" | "pp";
  inverse?: boolean;
}

const Delta: React.FC<DeltaProps> = ({ value, unit = "€", inverse = false }) => {
  const isPositive = value >= 0;
  const good       = inverse ? !isPositive : isPositive;
  const color      = value === 0
    ? "var(--text-3)"
    : good
    ? "var(--green-text)"
    : "var(--red)";
  const sign      = value > 0 ? "+" : "";
  const formatted = unit === "€"
    ? `${sign}€${Math.abs(value).toFixed(2)}`
    : `${sign}${value.toFixed(1)} pp`;

  return (
    <span style={{ color, fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
      {formatted}
    </span>
  );
};

export default Delta;
