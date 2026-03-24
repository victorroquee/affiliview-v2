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
  const refundColor = aff.refundRate > 10 ? "var(--red)" : aff.refundRate > 5 ? "var(--amber)" : undefined;

  return (
    <div className="aff-detail">
      {/* Back */}
      <button className="aff-back-btn" onClick={onBack}>
        <ArrowLeft size={15} />
        Voltar
      </button>

      {/* Nome */}
      <h2 className="aff-detail-name">{aff.name}</h2>

      {/* Grid de métricas resumidas */}
      <div className="aff-summary-grid">
        <SummaryCard label="Front orders"   value={fmtInt(aff.frontTotal)} />
        <SummaryCard label="Earnings totais" value={fmtEur(aff.totalEarn)} />
        <SummaryCard label="COGs totais"    value={fmtEur(aff.totalCogs)} />
        <SummaryCard
          label="Refund + CB"
          value={fmtPct(aff.refundRate)}
          color={refundColor}
        />
        <SummaryCard
          label="Lucro líquido"
          value={fmtEur(aff.netProfit)}
          color={aff.netProfit >= 0 ? "var(--green)" : "var(--red)"}
        />
      </div>

      {/* Badges inline */}
      <div className="aff-badges-row">
        <span
          className="aff-inline-badge"
          style={{
            background: refundColor ? "var(--red-bg)" : "var(--green-bg)",
            color: refundColor ?? "var(--green)",
            border: `1px solid ${refundColor ? "var(--red-bd)" : "var(--green-bd)"}`,
          }}
        >
          Reembolso: {fmtPct(aff.refundRate)}
        </span>
        <span className="aff-inline-badge" style={{ background: "var(--blue-bg)", color: "var(--blue)", border: "1px solid var(--blue-bd)" }}>
          Conv. upsell: {fmtPct(aff.upsellConvOverall)}
        </span>
        <span className="aff-inline-badge" style={{ background: "var(--bg-card)", color: "var(--text-2)", border: "1px solid var(--border-2)" }}>
          Margem alvo: {marginTarget}%
        </span>
      </div>

      {/* CPA máximo por variante */}
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
