import React from "react";
import type { VariantResult } from "../../lib/cpa/types";
import { OP_AVG } from "../../lib/cpa/constants";
import { formatEur as fmtEur, formatPct as fmtPct } from "../../lib/transactions";
import StatusBadge from "./StatusBadge";
import Delta from "./Delta";

const BORDER_COLOR: Record<VariantResult["cpaStatus"], string> = {
  increase: "#bbf7d0",
  ok:       "#bfdbfe",
  reduce:   "#fecaca",
};

interface MetricRowProps {
  label: string;
  value: string;
}
const MetricRow: React.FC<MetricRowProps> = ({ label, value }) => (
  <div className="vc-metric-row">
    <span className="vc-metric-label">{label}</span>
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
      {/* Header */}
      <div className="vc-header">
        <span className="vc-title">M{v.variant} — {v.bottles} potes</span>
        <StatusBadge status={v.cpaStatus} compact />
      </div>

      {/* Métricas */}
      <div className="vc-metrics">
        <MetricRow label="Pedidos"              value={String(v.count)} />
        <MetricRow label="Front earn/pedido"    value={fmtEur(v.frontEarnPer)} />
        <MetricRow label="Upsell earn/pedido"   value={fmtEur(v.upsellEarnPer)} />
        <MetricRow label="COGs/pedido"          value={fmtEur(v.frontCogsPer + v.upsellCogsPer)} />
        <MetricRow label="Conv. upsell"         value={fmtPct(v.upsellConv)} />
      </div>

      {/* LTV Lucro */}
      <div className="vc-ltv">
        <span className="vc-ltv-label">LTV lucro/pedido</span>
        <span className={`vc-ltv-value ${v.ltvProfit >= 0 ? "green" : "red"}`}>
          {fmtEur(v.ltvProfit)}
        </span>
      </div>

      {/* Caixa de CPA */}
      <div className="vc-cpa-box">
        <div className="vc-cpa-row">
          <span className="vc-cpa-label">CPA atual</span>
          <span className="vc-cpa-cur">{fmtEur(v.cpaDefault)}</span>
        </div>
        <div className="vc-cpa-arrow">→</div>
        <div className="vc-cpa-row">
          <span className="vc-cpa-label">CPA máximo</span>
          <span className={`vc-cpa-max ${v.cpaStatus === "reduce" ? "red" : "green"}`}>
            {fmtEur(v.maxCpa)}
          </span>
        </div>
        <div className="vc-cpa-delta">
          <Delta value={v.roomAboveCurrent} unit="€" />
        </div>
      </div>

      {/* vs média da operação */}
      {opAvg && (
        <div className="vc-op-avg">
          <span className="vc-op-title">vs média da operação</span>
          <div className="vc-op-rows">
            <div className="vc-op-row">
              <span>LTV lucro</span>
              <div className="vc-op-values">
                <span className="vc-op-abs">{fmtEur(v.ltvProfit)}</span>
                <Delta value={v.vsOpLtvProfit} unit="€" />
              </div>
            </div>
            <div className="vc-op-row">
              <span>Conv. upsell</span>
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
