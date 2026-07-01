import React, { useMemo, useState } from "react";
import { DollarSign, TriangleAlert, Info, User, X } from "lucide-react";
import LoadingDot from "../components/LoadingDot";
import type { TransactionRow } from "../lib/transactions";
import { formatEur } from "../lib/transactions";
import { useCpaFixo } from "../hooks/useCpaFixo";
import { computeVatMix, VAT_PRESETS, UPSELL_AVG_PRICE } from "../lib/cpa/cpaFixoModel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

interface NumFieldProps {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  step?: number;
  suffix?: string;
  readOnly?: boolean;
}

function NumField({ label, value, onChange, step = 1, suffix, readOnly }: NumFieldProps) {
  return (
    <label className="cpacalc-field">
      <span className="cpacalc-field-label">{label}</span>
      <div className="cpacalc-field-input-wrap">
        <input
          className={`cpacalc-field-input ${readOnly ? "readonly" : ""}`}
          type="number"
          step={step}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
        />
        {suffix && <span className="cpacalc-field-suffix">{suffix}</span>}
      </div>
    </label>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface CpaFixoProps {
  filteredRows: TransactionRow[];
  loading: boolean;
}

const CpaFixo: React.FC<CpaFixoProps> = ({ filteredRows, loading }) => {
  const { inputs, update, outputs, affiliates, selected, selectedAffiliate, selectAffiliate } =
    useCpaFixo(filteredRows);

  const [search, setSearch] = useState("");
  const [vatMixOpen, setVatMixOpen] = useState(false);

  const filteredAffs = useMemo(() => {
    if (!search.trim()) return affiliates;
    return affiliates.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [affiliates, search]);

  if (filteredRows.length === 0) {
    return (
      <div className="cpacalc-page">
        <CpaFixoHeader />
        <div className="empty-state">
          <div className="empty-state-icon-row">
            <DollarSign size={36} strokeWidth={1.4} />
            {loading && <LoadingDot />}
          </div>
          <h3>{loading ? "Buscando transações..." : "Nenhum dado carregado"}</h3>
          <p>
            {loading
              ? "Aguarde enquanto os dados são carregados da API Digistore24."
              : "Os dados são carregados automaticamente ao abrir o dashboard. Você ainda pode usar a calculadora no modo manual."}
          </p>
        </div>
      </div>
    );
  }

  const { breakdown, simulator } = outputs;
  const marginPct = simulator.marginPct;
  const marginStatus =
    marginPct >= 10
      ? { text: "✓ saudável (≥10%)", cls: "green" }
      : marginPct >= 5
      ? { text: "⚠ apertada (5–10%)", cls: "amber" }
      : marginPct >= 0
      ? { text: "⚠ crítica (<5%)", cls: "red" }
      : { text: "✗ prejuízo", cls: "red" };

  const setVatPreset = (v: number) => {
    setVatMixOpen(false);
    update("vat", v);
  };
  const onVatMixChange = (key: "pctDE" | "pctAT" | "pctCH", v: number) => {
    const next = { ...inputs, [key]: v };
    update(key, v);
    update("vat", Math.round(computeVatMix(next.pctDE, next.pctAT, next.pctCH) * 100) / 100);
  };

  return (
    <div className="cpacalc-page">
      <CpaFixoHeader />

      <div className="cpacalc-main">
        {/* ═══ Coluna esquerda — Inputs ═══ */}
        <div className="cpacalc-col-inputs">
          {/* ── Seletor de afiliado ── */}
          <div className="cpacalc-card">
            <div className="cpacalc-card-title">Afiliado</div>
            <div className="cpacalc-aff-controls">
              <input
                className="cpacalc-search"
                placeholder="Buscar afiliado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className={`cpacalc-manual-btn ${selected === null ? "active" : ""}`}
                onClick={() => selectAffiliate(null)}
              >
                Manual (sem afiliado)
              </button>
            </div>
            <div className="cpacalc-aff-list">
              {filteredAffs.slice(0, 30).map((a) => (
                <button
                  key={a.name}
                  className={`cpacalc-aff-item ${selected === a.name ? "active" : ""}`}
                  onClick={() => selectAffiliate(a.name)}
                >
                  <span className="cpacalc-aff-name">
                    <User size={12} strokeWidth={1.6} />
                    {a.name}
                  </span>
                  <span className="cpacalc-aff-meta">
                    {a.frontOrders} fronts · AOV {formatEur(a.aov)}
                  </span>
                </button>
              ))}
              {filteredAffs.length === 0 && (
                <div className="cpacalc-aff-empty">Nenhum afiliado com fronts M1/M2/M3 no período.</div>
              )}
            </div>
            {selectedAffiliate && (
              <div className="cpacalc-chips">
                <span className="cpacalc-chip">AOV real: {formatEur(selectedAffiliate.aov)}</span>
                <span className="cpacalc-chip">
                  Reembolso: {fmtPct(selectedAffiliate.refundRate * 100)}
                </span>
                <span className="cpacalc-chip">
                  Mix: {selectedAffiliate.mix.M3.toFixed(0)}% M3 · {selectedAffiliate.mix.M2.toFixed(0)}% M2 ·{" "}
                  {selectedAffiliate.mix.M1.toFixed(0)}% M1
                </span>
                <button className="cpacalc-chip-clear" onClick={() => selectAffiliate(null)} title="Limpar seleção">
                  <X size={11} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>

          {/* ── Faturamento ── */}
          <div className="cpacalc-card">
            <div className="cpacalc-card-title">Faturamento</div>
            <div className="cpacalc-grid-2">
              <NumField label="AOV (€, com VAT)" value={inputs.aov} onChange={(v) => update("aov", v)} step={1} suffix="€" />
              <NumField label="Taxa de reembolso" value={inputs.refund} onChange={(v) => update("refund", v)} step={0.5} suffix="%" />
            </div>
          </div>

          {/* ── Mix ── */}
          <div className="cpacalc-card">
            <div className="cpacalc-card-title">Modo de cálculo do mix</div>
            <div className="cpacalc-tabs">
              <button
                className={`cpacalc-tab ${inputs.mixMode === "auto" ? "active" : ""}`}
                onClick={() => update("mixMode", "auto")}
              >
                Automático
              </button>
              <button
                className={`cpacalc-tab ${inputs.mixMode === "manual" ? "active" : ""}`}
                onClick={() => update("mixMode", "manual")}
              >
                Manual
              </button>
            </div>

            {inputs.mixMode === "auto" ? (
              <div className="cpacalc-note">
                <Info size={13} strokeWidth={1.6} />
                <span>
                  Mix fixo da operação (6% M1 · 27% M2 · 67% M3). A taxa de upsell é derivada do AOV
                  informado (upsell médio €{UPSELL_AVG_PRICE}).
                </span>
              </div>
            ) : (
              <div className="cpacalc-manual-mix">
                {(["mixM1", "mixM2", "mixM3"] as const).map((key, i) => (
                  <label key={key} className="cpacalc-slider-row">
                    <span className="cpacalc-slider-label">M{i + 1}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={inputs[key]}
                      onChange={(e) => update(key, parseFloat(e.target.value))}
                    />
                    <span className="cpacalc-slider-val">{inputs[key].toFixed(0)}%</span>
                  </label>
                ))}
                <div className="cpacalc-grid-2" style={{ marginTop: 10 }}>
                  <NumField label="Taxa de upsell" value={inputs.upsellRate} onChange={(v) => update("upsellRate", v)} step={1} suffix="%" />
                  <NumField label="Potes por upsell" value={inputs.upsellPots} onChange={(v) => update("upsellPots", v)} step={0.1} />
                </div>
              </div>
            )}
          </div>

          {/* ── Premissas globais ── */}
          <details className="cpacalc-card cpacalc-details">
            <summary className="cpacalc-card-title">Premissas globais</summary>
            <div className="cpacalc-grid-2">
              <NumField label="Custo por pote" value={inputs.costPerPot} onChange={(v) => update("costPerPot", v)} step={0.01} suffix="€" />
              <NumField label="Shipping por venda FE" value={inputs.shipping} onChange={(v) => update("shipping", v)} step={0.01} suffix="€" />
              <NumField label="Comissão Digistore" value={inputs.digi} onChange={(v) => update("digi", v)} step={0.01} suffix="%" />
              <NumField label="Retenção (reserva)" value={inputs.retention} onChange={(v) => update("retention", v)} step={1} suffix="%" />
            </div>

            <div className="cpacalc-subtitle">VAT</div>
            <div className="cpacalc-vat-btns">
              {(Object.entries(VAT_PRESETS) as ["DE" | "AT" | "CH", number][]).map(([cc, v]) => (
                <button
                  key={cc}
                  className={`cpacalc-vat-btn ${!vatMixOpen && Math.abs(inputs.vat - v) < 0.005 ? "active" : ""}`}
                  onClick={() => setVatPreset(v)}
                >
                  {cc} {v}%
                </button>
              ))}
              <button
                className={`cpacalc-vat-btn ${vatMixOpen ? "active" : ""}`}
                onClick={() => {
                  setVatMixOpen(true);
                  update("vat", Math.round(computeVatMix(inputs.pctDE, inputs.pctAT, inputs.pctCH) * 100) / 100);
                }}
              >
                Mix
              </button>
            </div>
            {vatMixOpen && (
              <div className="cpacalc-grid-3">
                <NumField label="% vendas DE" value={inputs.pctDE} onChange={(v) => onVatMixChange("pctDE", v)} suffix="%" />
                <NumField label="% vendas AT" value={inputs.pctAT} onChange={(v) => onVatMixChange("pctAT", v)} suffix="%" />
                <NumField label="% vendas CH" value={inputs.pctCH} onChange={(v) => onVatMixChange("pctCH", v)} suffix="%" />
              </div>
            )}
            <div className="cpacalc-grid-2">
              <NumField label="VAT efetivo" value={inputs.vat} onChange={(v) => { setVatMixOpen(false); update("vat", v); }} step={0.1} suffix="%" />
              <NumField label="VAT extraído por venda" value={Math.round(breakdown.vatCost * 100) / 100} readOnly suffix="€" />
            </div>

            <div className="cpacalc-subtitle">Custo de capital</div>
            <div className="cpacalc-grid-3">
              <NumField label="Taxa anual" value={inputs.capitalRate} onChange={(v) => update("capitalRate", v)} suffix="%" />
              <NumField label="Dias de retenção" value={inputs.retentionDays} onChange={(v) => update("retentionDays", v)} />
              <NumField label="Custo efetivo" value={Math.round(outputs.effCapital * 100000) / 1000} readOnly suffix="%" />
            </div>
          </details>
        </div>

        {/* ═══ Coluna direita — Resultados ═══ */}
        <div className="cpacalc-col-results">
          {/* ── KPIs ── */}
          <div className="cpacalc-kpi-row">
            <div className="cpacalc-kpi">
              <div className="cpacalc-kpi-label">AOV real (com VAT)</div>
              <div className="cpacalc-kpi-value">{formatEur(outputs.realAOV)}</div>
              <div className="cpacalc-kpi-sub">
                {(outputs.mix.M3 * 100).toFixed(0)}% M3 · {(outputs.mix.M2 * 100).toFixed(0)}% M2 ·{" "}
                {(outputs.mix.M1 * 100).toFixed(0)}% M1
              </div>
            </div>
            <div className="cpacalc-kpi">
              <div className="cpacalc-kpi-label">Sobra antes do CPA</div>
              <div className={`cpacalc-kpi-value ${outputs.sobra < 0 ? "red" : "green"}`}>
                {formatEur(outputs.sobra)}
              </div>
              <div className="cpacalc-kpi-sub">
                por venda FE · {formatEur(outputs.sobra * inputs.volume)} no volume informado
              </div>
            </div>
          </div>

          {/* ── Tabela CPA por margem ── */}
          <div className="cpacalc-card">
            <div className="cpacalc-card-title">CPA máximo por margem alvo</div>
            <table className="cpacalc-table">
              <thead>
                <tr>
                  <th>Margem</th>
                  <th style={{ textAlign: "right" }}>CPA máximo</th>
                  <th style={{ textAlign: "right" }}>Lucro/venda</th>
                </tr>
              </thead>
              <tbody>
                {outputs.rows.map((r) => (
                  <tr key={r.margin}>
                    <td className="cpacalc-td-margin">{r.margin}%</td>
                    <td className={`cpacalc-td-num ${r.cpa < 0 ? "red" : "green"}`}>{formatEur(r.cpa)}</td>
                    <td className="cpacalc-td-num">{formatEur(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Alertas ── */}
          {outputs.alerts.length > 0 && (
            <div className="cpacalc-alerts">
              {outputs.alerts.map((a, i) => (
                <div key={i} className={`cpacalc-alert ${a.type}`}>
                  <TriangleAlert size={14} strokeWidth={1.6} />
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Breakdown ── */}
          <details className="cpacalc-card cpacalc-details">
            <summary className="cpacalc-card-title">Breakdown por venda FE</summary>
            <div className="cpacalc-bd">
              <div className="cpacalc-bd-row">
                <span>Mix FE</span>
                <span>
                  M3: {(outputs.mix.M3 * 100).toFixed(0)}% · M2: {(outputs.mix.M2 * 100).toFixed(0)}% · M1:{" "}
                  {(outputs.mix.M1 * 100).toFixed(0)}%
                </span>
              </div>
              <div className="cpacalc-bd-row"><span>Preço médio FE</span><span>{formatEur(outputs.fePrice)}</span></div>
              <div className="cpacalc-bd-row"><span>Taxa de upsell</span><span>{fmtPct(outputs.upsellRate * 100, 2)}</span></div>
              <div className="cpacalc-bd-row"><span>AOV real (com VAT)</span><span>{formatEur(outputs.realAOV)}</span></div>
              <div className="cpacalc-bd-row">
                <span>Receita líquida (após {fmtPct(inputs.refund, 1)} reembolso)</span>
                <span>{formatEur(outputs.netRevenue)}</span>
              </div>
              <div className="cpacalc-bd-row neg"><span>− VAT ({fmtPct(inputs.vat, 1)})</span><span>{formatEur(-breakdown.vatCost)}</span></div>
              <div className="cpacalc-bd-row neg">
                <span>− Produto ({breakdown.totalPots.toFixed(2)} potes × {formatEur(inputs.costPerPot)})</span>
                <span>{formatEur(-breakdown.productCost)}</span>
              </div>
              <div className="cpacalc-bd-row neg"><span>− Shipping</span><span>{formatEur(-breakdown.shipCost)}</span></div>
              <div className="cpacalc-bd-row neg"><span>− Digistore ({fmtPct(inputs.digi, 2)})</span><span>{formatEur(-breakdown.digiCost)}</span></div>
              <div className="cpacalc-bd-row neg">
                <span>− Custo capital + provisão ({(outputs.effCapital * 100).toFixed(3)}%)</span>
                <span>{formatEur(-breakdown.capitalCost)}</span>
              </div>
              <div className="cpacalc-bd-row total"><span>Sobra para CPA + margem</span><span>{formatEur(outputs.sobra)}</span></div>
            </div>
          </details>

          {/* ── Simulador ── */}
          <div className="cpacalc-card cpacalc-sim">
            <div className="cpacalc-card-title">Simulador de CPA fixo</div>
            <div className="cpacalc-grid-2">
              <NumField label="CPA pretendido" value={inputs.testCPA} onChange={(v) => update("testCPA", v)} suffix="€" />
              <NumField label="Volume (vendas/mês)" value={inputs.volume} onChange={(v) => update("volume", v)} />
            </div>
            <div className="cpacalc-sim-kpis">
              <div className="cpacalc-sim-kpi">
                <div className="cpacalc-kpi-label">Lucro por venda</div>
                <div className={`cpacalc-kpi-value ${simulator.profitPerSale > 0 ? "green" : "red"}`}>
                  {formatEur(simulator.profitPerSale)}
                </div>
              </div>
              <div className="cpacalc-sim-kpi">
                <div className="cpacalc-kpi-label">Margem resultante</div>
                <div className={`cpacalc-kpi-value ${marginStatus.cls}`}>{marginPct.toFixed(1)}%</div>
                <div className={`cpacalc-kpi-sub ${marginStatus.cls}`}>{marginStatus.text}</div>
              </div>
              <div className="cpacalc-sim-kpi">
                <div className="cpacalc-kpi-label">Lucro mensal</div>
                <div className={`cpacalc-kpi-value ${simulator.monthlyProfit > 0 ? "green" : "red"}`}>
                  {formatEur(simulator.monthlyProfit)}
                </div>
                <div className="cpacalc-kpi-sub">
                  {inputs.volume} vendas × {formatEur(simulator.profitPerSale)}/venda
                </div>
              </div>
              <div className="cpacalc-sim-kpi">
                <div className="cpacalc-kpi-label">Faturamento líq./mês</div>
                <div className="cpacalc-kpi-value">{formatEur(simulator.monthlyRevenue)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

function CpaFixoHeader() {
  return (
    <div className="cpa-shell-header">
      <div className="cpa-shell-title">
        <DollarSign size={20} strokeWidth={1.4} />
        <div>
          <div className="cpa-shell-label">Gestão de Afiliados</div>
          <h1 className="cpa-shell-h1">Calculadora CPA Fixo</h1>
        </div>
      </div>
    </div>
  );
}

export default CpaFixo;
