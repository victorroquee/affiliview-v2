import React from "react";
import type { VariantResult } from "../../lib/cpa/types";
import { OP_AVG } from "../../lib/cpa/constants";
import { formatEur as fmtEur, formatPct as fmtPct } from "../../lib/transactions";
import StatusBadge from "./StatusBadge";
import Delta from "./Delta";
import InfoTooltip from "../InfoTooltip";

const BORDER_COLOR: Record<VariantResult["cpaStatus"], string> = {
  increase: "var(--green-bd)",
  ok:       "var(--blue-bd)",
  reduce:   "var(--red-bd)",
};

interface MetricRowProps {
  label: string;
  value: string;
  info?: string;
}
const MetricRow: React.FC<MetricRowProps> = ({ label, value, info }) => (
  <div className="vc-metric-row">
    <span className="vc-metric-label">
      {label}
      {info && <InfoTooltip text={info} />}
    </span>
    <span className="vc-metric-value">{value}</span>
  </div>
);

interface VariantCardProps {
  v: VariantResult;
}

const VariantCard: React.FC<VariantCardProps> = ({ v }) => {
  const opAvg = OP_AVG[v.variant];

  return (
    <div
      className="variant-card"
      style={{ borderColor: BORDER_COLOR[v.cpaStatus] }}
    >
      <div className="vc-header">
        <span className="vc-title">M{v.variant} — {v.bottles} potes</span>
        <StatusBadge status={v.cpaStatus} compact />
      </div>

      <div className="vc-metrics">
        <MetricRow
          label="Pedidos"
          value={String(v.count)}
          info="Número de pedidos frontais do afiliado nesta variante de kit no período selecionado."
        />
        <MetricRow
          label="Front earn/pedido"
          value={fmtEur(v.frontEarnPer)}
          info="Média de earned_amount por pedido front desta variante. Representa a margem da plataforma por aquisição frontal."
        />
        <MetricRow
          label="Upsell earn/pedido"
          value={fmtEur(v.upsellEarnPer)}
          info="Earnings adicionais gerados por upsells desta variante, em média por pedido front. Inclui todos os upsells associados."
        />
        <MetricRow
          label="COGs/pedido"
          value={fmtEur(v.frontCogsPer + v.upsellCogsPer)}
          info="Custo médio de produto + frete por pedido desta variante, somando front e upsells ponderados pela conversão."
        />
        <MetricRow
          label="Conv. upsell"
          value={fmtPct(v.upsellConv)}
          info="% de pedidos front desta variante que geraram ao menos um upsell associado. Afeta o LTV líquido por aquisição."
        />
      </div>

      <div className="vc-ltv">
        <span className="vc-ltv-label">
          LTV lucro/pedido
          <InfoTooltip text="Front earn/pedido + Upsell earn/pedido − COGs/pedido. Lucro líquido por aquisição nesta variante — base para calcular o CPA máximo." />
        </span>
        <span className={`vc-ltv-value ${v.ltvProfit >= 0 ? "green" : "red"}`}>
          {fmtEur(v.ltvProfit)}
        </span>
      </div>

      <div className="vc-cpa-box">
        <div className="vc-cpa-row">
          <span className="vc-cpa-label">
            CPA atual
            <InfoTooltip text="Valor de comissão por pedido front atualmente configurado para o afiliado nesta variante de kit." />
          </span>
          <span className="vc-cpa-cur">{fmtEur(v.cpaDefault)}</span>
        </div>
        <div className="vc-cpa-arrow">→</div>
        <div className="vc-cpa-row">
          <span className="vc-cpa-label">
            CPA máximo
            <InfoTooltip text="LTV lucro/pedido × (1 − margem alvo / 100). Máximo sustentável antes de comprometer a margem da operação." />
          </span>
          <span className={`vc-cpa-max ${v.cpaStatus === "reduce" ? "red" : "green"}`}>
            {fmtEur(v.maxCpa)}
          </span>
        </div>
        <div className="vc-cpa-delta">
          <Delta value={v.roomAboveCurrent} unit="€" />
        </div>
      </div>

      {opAvg && (
        <div className="vc-op-avg">
          <span className="vc-op-title">vs média da operação</span>
          <div className="vc-op-rows">
            <div className="vc-op-row">
              <span>
                LTV lucro
                <InfoTooltip text="Diferença do LTV lucro/pedido desta variante em relação à média de todos os afiliados nesta mesma variante." />
              </span>
              <div className="vc-op-values">
                <span className="vc-op-abs">{fmtEur(v.ltvProfit)}</span>
                <Delta value={v.vsOpLtvProfit} unit="€" />
              </div>
            </div>
            <div className="vc-op-row">
              <span>
                Conv. upsell
                <InfoTooltip text="Diferença em pontos percentuais da conversão de upsell desta variante em relação à média da operação." />
              </span>
              <div className="vc-op-values">
                <span className="vc-op-abs">{fmtPct(v.upsellConv)}</span>
                <Delta value={v.vsOpUpsellConv} unit="pp" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantCard;
