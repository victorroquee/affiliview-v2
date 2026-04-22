import React from "react";
import { ArrowLeft } from "lucide-react";
import type { AffiliateResult, SimulatedAffiliateResult } from "../../lib/cpa/types";
import { formatEur as fmtEur, formatPct as fmtPct, formatInt as fmtInt } from "../../lib/transactions";
import VariantCard from "./VariantCard";
import InfoTooltip from "../InfoTooltip";

interface SummaryCardProps {
  label: string;
  value: string;
  color?: string;
  info?: string;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color, info }) => (
  <div className="aff-summary-card">
    <span className="aff-summary-label">
      {label}
      {info && <InfoTooltip text={info} />}
    </span>
    <span className="aff-summary-value" style={color ? { color } : undefined}>
      {value}
    </span>
  </div>
);

interface AffiliateDetailProps {
  aff:          AffiliateResult | SimulatedAffiliateResult;
  marginTarget: number;
  setCustomCpa?: (affName: string, variant: number, value: number | null) => void;
  onBack:       () => void;
}

const AffiliateDetail: React.FC<AffiliateDetailProps> = ({ aff, marginTarget, setCustomCpa, onBack }) => {
  const refundHigh = aff.refundRate > 10;
  const refundMid  = aff.refundRate > 5;

  return (
    <div className="aff-detail">
      <button className="aff-back-btn" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.4} />
        Voltar
      </button>

      <h2 className="aff-detail-name">{aff.name}</h2>

      <div className="aff-summary-grid">
        <SummaryCard
          label="Front orders"
          value={fmtInt(aff.frontTotal)}
          info="Total de pedidos frontais (upsell_no=0) do afiliado no período selecionado."
        />
        <SummaryCard
          label="Earnings totais"
          value={fmtEur(aff.totalEarn)}
          info="Soma de earned_amount de todas as transações do afiliado (front + upsell), incluindo estornos negativos de reembolsos e chargebacks."
        />
        <SummaryCard
          label="COGs totais"
          value={fmtEur(aff.totalCogs)}
          info="Custo total de produtos e frete (COGS) de todas as transações atribuídas ao afiliado no período."
        />
        <SummaryCard
          label="Refund + CB"
          value={fmtPct(aff.refundRate)}
          color={refundHigh ? "var(--red)" : refundMid ? "var(--amber)" : undefined}
          info="Taxa count-based de reembolsos + chargebacks do afiliado. Laranja >5%, vermelho >10%. Impacta diretamente o CPA máximo calculável."
        />
        <SummaryCard
          label="Lucro líquido"
          value={fmtEur(aff.netProfit)}
          color={aff.netProfit >= 0 ? "var(--green-text)" : "var(--red)"}
          info="Earnings totais − COGs totais do afiliado. Representa o lucro operacional após todos os custos variáveis do período."
        />
      </div>

      <div className="aff-badges-row">
        <span
          className="aff-inline-badge"
          style={{
            background: refundHigh ? "var(--red-bg)" : refundMid ? "var(--amber-bg)" : "var(--green-bg)",
            color:      refundHigh ? "var(--red)"    : refundMid ? "var(--amber)"    : "var(--green-text)",
          }}
        >
          Reembolso: {fmtPct(aff.refundRate)}
          <InfoTooltip text="Taxa count-based de reembolsos + chargebacks sobre pedidos front. Afeta o CPA máximo sustentável." />
        </span>
        <span
          className="aff-inline-badge"
          style={{ background: "var(--blue-bg)", color: "var(--blue)" }}
        >
          Conv. upsell: {fmtPct(aff.upsellConvOverall)}
          <InfoTooltip text="% de pedidos front que geraram ao menos um upsell associado no período. Indicador de qualidade do tráfego." />
        </span>
        <span
          className="aff-inline-badge"
          style={{ background: "var(--bg-secondary)", color: "var(--text-2)" }}
        >
          Margem alvo: {marginTarget}%
          <InfoTooltip text="Margem mínima de lucro que a operação deve preservar por pedido. Usada para calcular o CPA máximo de cada variante." />
        </span>
      </div>

      <div className="section-header" style={{ marginTop: 24 }}>
        <h2>CPA máximo por variante</h2>
      </div>
      <div className="aff-variants-grid">
        {aff.variants.map(v => (
          <VariantCard
            key={v.variant}
            v={v}
            affName={aff.name}
            setCustomCpa={setCustomCpa ?? undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default AffiliateDetail;
