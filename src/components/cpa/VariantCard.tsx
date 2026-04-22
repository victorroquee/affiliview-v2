import React from "react";
import type { SimulatedVariant } from "../../lib/cpa/types";
import { OP_AVG } from "../../lib/cpa/constants";
import { formatEur as fmtEur, formatPct as fmtPct } from "../../lib/transactions";
import StatusBadge from "./StatusBadge";
import Delta from "./Delta";
import InfoTooltip from "../InfoTooltip";

const BORDER_COLOR: Record<SimulatedVariant["cpaStatus"], string> = {
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
  v: SimulatedVariant;
  affName: string;
  setCustomCpa: (affName: string, variant: number, value: number | null) => void;
}

const VariantCard: React.FC<VariantCardProps> = ({ v, affName, setCustomCpa }) => {
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

      {/* Simulation section */}
      <div className="vc-sim-box" style={{
        marginTop: 12, padding: "10px 12px",
        background: "var(--bg-secondary)", borderRadius: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>
          Simulacao CPA
        </div>

        {/* Custom CPA input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: "var(--text-2)", minWidth: 80 }}>CPA proposto:</label>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>€</span>
          <input
            type="number"
            min={0}
            step={1}
            placeholder={String(v.cpaDefault)}
            value={v.customCpa ?? ""}
            onChange={e => {
              const raw = e.target.value;
              if (raw === "") {
                setCustomCpa(affName, v.variant, null);
              } else {
                setCustomCpa(affName, v.variant, Number(raw));
              }
            }}
            style={{
              width: 80, padding: "4px 8px", borderRadius: 4,
              border: "1px solid var(--border)", background: "var(--bg-primary)",
              color: "var(--text-1)", fontSize: 13, fontVariantNumeric: "tabular-nums",
            }}
          />
          {v.customCpa !== undefined && (
            <button
              onClick={() => setCustomCpa(affName, v.variant, null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-3)", fontSize: 11, textDecoration: "underline",
              }}
            >
              limpar
            </button>
          )}
        </div>

        {/* Results row — only show when custom CPA is set */}
        {v.customCpa !== undefined && v.customMargin !== undefined && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-2)" }}>Margem resultante:</span>
              <span style={{
                fontWeight: 600,
                color: v.customMargin >= 0 ? "var(--green-text)" : "var(--red)",
              }}>
                {fmtEur(v.customMargin)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-2)" }}>Delta vs atual:</span>
              <Delta value={v.cpaDelta} unit="€" />
            </div>
          </div>
        )}

        {/* simMaxCpa row — always show when marginTarget produces meaningful data */}
        {v.simMaxCpa > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: v.customCpa !== undefined ? 8 : 0 }}>
            <span style={{ color: "var(--text-2)" }}>CPA max (margem alvo):</span>
            <span style={{ fontWeight: 600, color: v.simCpaStatus === "reduce" ? "var(--red)" : "var(--green-text)" }}>
              {fmtEur(v.simMaxCpa)}
            </span>
          </div>
        )}
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
