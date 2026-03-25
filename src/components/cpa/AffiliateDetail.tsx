import React from "react";
import { ArrowLeft } from "lucide-react";
import type { AffiliateResult } from "../../lib/cpa/types";
import { formatEur as fmtEur, formatPct as fmtPct, formatInt as fmtInt } from "../../lib/transactions";
import VariantCard from "./VariantCard";

interface SummaryCardProps {
  label: string;
  value: string;
  color?: string;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color }) => (
  <div className="aff-summary-card">
    <span className="aff-summary-label">{label}</span>
    <span className="aff-summary-value" style={color ? { color } : undefined}>
      {value}
    </span>
  </div>
);

interface AffiliateDetailProps {
  aff:          AffiliateResult;
  marginTarget: number;
  onBack:       () => void;
}

const AffiliateDetail: React.FC<AffiliateDetailProps> = ({ aff, marginTarget, onBack }) => {
  const refundColor = aff.refundRate > 10
    ? "#C92A2A"
    : aff.refundRate > 5
    ? "#B45309"
    : undefined;

  return (
    <div className="aff-detail">
      <button className="aff-back-btn" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.4} />
        Voltar
      </button>

      <h2 className="aff-detail-name">{aff.name}</h2>

      <div className="aff-summary-grid">
        <SummaryCard label="Front orders"    value={fmtInt(aff.frontTotal)} />
        <SummaryCard label="Earnings totais" value={fmtEur(aff.totalEarn)} />
        <SummaryCard label="COGs totais"     value={fmtEur(aff.totalCogs)} />
        <SummaryCard
          label="Refund + CB"
          value={fmtPct(aff.refundRate)}
          color={refundColor}
        />
        <SummaryCard
          label="Lucro líquido"
          value={fmtEur(aff.netProfit)}
          color={aff.netProfit >= 0 ? "#0D5C2E" : "#C92A2A"}
        />
      </div>

      <div className="aff-badges-row">
        <span
          className="aff-inline-badge"
          style={{
            background: refundColor ? "#FFF0F0" : "#EDFAF3",
            color: refundColor ?? "#0D5C2E",
          }}
        >
          Reembolso: {fmtPct(aff.refundRate)}
        </span>
        <span
          className="aff-inline-badge"
          style={{ background: "#EFF6FF", color: "#1D4ED8" }}
        >
          Conv. upsell: {fmtPct(aff.upsellConvOverall)}
        </span>
        <span
          className="aff-inline-badge"
          style={{ background: "#F8F9FB", color: "#4A5165" }}
        >
          Margem alvo: {marginTarget}%
        </span>
      </div>

      <div className="section-header" style={{ marginTop: 24 }}>
        <h2>CPA máximo por variante</h2>
      </div>
      <div className="aff-variants-grid">
        {aff.variants.map(v => (
          <VariantCard key={v.variant} v={v} />
        ))}
      </div>
    </div>
  );
};

export default AffiliateDetail;
