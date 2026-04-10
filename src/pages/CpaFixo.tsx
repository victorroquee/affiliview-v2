import React, { useMemo, useState } from "react";
import {
  DollarSign,
  ChevronLeft,
  TriangleAlert,
  Settings2,
  ChevronDown,
  ChevronUp,
  Users,
  Minus,
  Plus,
} from "lucide-react";
import LoadingDot from "../components/LoadingDot";
import type { TransactionRow } from "../lib/transactions";
import { isPayment, isRefund, isChargeback, isMaileonardo } from "../lib/transactions";
import { getFrontVariant } from "../lib/cpa/parseHelpers";

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = {
  id: string;
  label: string;
  gross: number;
  cogs: number;
};

type AffiliateData = {
  name: string;
  orders_por_variante: Record<string, number>;
  total_orders: number;
  gross_bruto: number;
  refund_amt: number;
  reembolso_rate: number;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_VARIANTS: Variant[] = [
  { id: "M1", label: "M1 — 2 Potes", gross: 163, cogs: 18 },
  { id: "M2", label: "M2 — 3 Potes", gross: 210, cogs: 22 },
  { id: "M3", label: "M3 — 6 Potes", gross: 298, cogs: 33 },
];

const AOV_SENSITIVITY_POINTS = [220, 240, 250, 267, 280, 298];

const VARIANT_COLORS: Record<string, string> = {
  M1: "#3B82F6",
  M2: "#8B5CF6",
  M3: "#15803D",
};

// ─── Data Aggregation ─────────────────────────────────────────────────────────

function aggregateAffiliates(rows: TransactionRow[]): AffiliateData[] {
  const map = new Map<
    string,
    { orders: Record<string, number>; total: number; gross_bruto: number; refund_amt: number }
  >();

  for (const t of rows) {
    const name = t.affiliate.trim();
    if (!name || name === "(direto)" || isMaileonardo(name)) continue;

    if (isPayment(t) && t.upsellNo === 0) {
      const v = getFrontVariant(t.productName);
      if (!v) continue;
      const key = `M${v}`;
      const e = map.get(name) ?? { orders: {}, total: 0, gross_bruto: 0, refund_amt: 0 };
      e.orders[key] = (e.orders[key] ?? 0) + 1;
      e.total += 1;
      e.gross_bruto += t.grossAmount;
      map.set(name, e);
    }

    if ((isRefund(t) || isChargeback(t)) && t.upsellNo === 0) {
      const v = getFrontVariant(t.productName);
      if (!v) continue;
      const e = map.get(name);
      if (!e) continue;
      e.refund_amt += t.grossAmount;
      map.set(name, e);
    }
  }

  return Array.from(map.entries())
    .filter(([, e]) => e.total >= 1)
    .map(([name, e]) => ({
      name,
      orders_por_variante: e.orders,
      total_orders: e.total,
      gross_bruto: e.gross_bruto,
      refund_amt: e.refund_amt,
      reembolso_rate: e.gross_bruto > 0 ? e.refund_amt / e.gross_bruto : 0,
    }))
    .sort((a, b) => b.total_orders - a.total_orders);
}

// ─── Calculation ──────────────────────────────────────────────────────────────

type CalcResult = {
  mix: Record<string, number>;
  aov_gross: number;
  net_ponderado: number;
  cogs_ponderados: number;
  margem_bruta: number;
  perda_reembolso: number;
  margem_final: number;
};

function calcCPAFixo(
  aff: AffiliateData,
  variants: Variant[],
  net_rate: number
): CalcResult {
  const mix: Record<string, number> = {};
  for (const [k, count] of Object.entries(aff.orders_por_variante)) {
    mix[k] = aff.total_orders > 0 ? count / aff.total_orders : 0;
  }

  const aov_gross = variants.reduce((acc, v) => acc + v.gross * (mix[v.id] ?? 0), 0);
  const net_ponderado = aov_gross * net_rate;
  const cogs_ponderados = variants.reduce((acc, v) => acc + v.cogs * (mix[v.id] ?? 0), 0);
  const margem_bruta = net_ponderado - cogs_ponderados;
  const perda_reembolso = net_ponderado * aff.reembolso_rate;
  const margem_final = margem_bruta - perda_reembolso;

  return { mix, aov_gross, net_ponderado, cogs_ponderados, margem_bruta, perda_reembolso, margem_final };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number, decimals = 0): string {
  return `€${v.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Thin mix bar shown inside the affiliate list item */
function MiniMixBar({ orders, total }: { orders: Record<string, number>; total: number }) {
  const segs = Object.entries(orders)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, n]) => ({ id, pct: total > 0 ? (n / total) * 100 : 0 }));
  return (
    <div className="cpaf-aff-mini-bar">
      {segs.map((s) => (
        <div key={s.id} style={{ width: `${s.pct}%`, background: VARIANT_COLORS[s.id] ?? "#9299A8" }} />
      ))}
    </div>
  );
}

/** Segmented mix bar in the detail view */
function MixBar({ mix, variants }: { mix: Record<string, number>; variants: Variant[] }) {
  return (
    <div className="cpaf-mix-bar-wrap">
      <div className="cpaf-mix-bar">
        {variants.map((v) => {
          const pct = (mix[v.id] ?? 0) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={v.id}
              className="cpaf-mix-bar-seg"
              style={{ width: `${pct}%`, background: VARIANT_COLORS[v.id] ?? "#9299A8" }}
              title={`${v.id}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="cpaf-mix-legend">
        {variants.map((v) => {
          const pct = (mix[v.id] ?? 0) * 100;
          if (pct === 0) return null;
          return (
            <div key={v.id} className="cpaf-mix-legend-item">
              <span className="cpaf-mix-legend-dot" style={{ background: VARIANT_COLORS[v.id] ?? "#9299A8" }} />
              <span className="cpaf-mix-legend-label">{v.id}</span>
              <span className="cpaf-mix-legend-val">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface CpaFixoProps {
  filteredRows: TransactionRow[];
  loading: boolean;
}

const CpaFixo: React.FC<CpaFixoProps> = ({ filteredRows, loading }) => {
  const [selected, setSelected]       = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [margemMinima, setMargemMinima] = useState(30);
  const [configOpen, setConfigOpen]   = useState(false);

  const [variants, setVariants] = useState<Variant[]>(DEFAULT_VARIANTS);
  const [netRate, setNetRate]   = useState(0.831);
  const [aovMinimo, setAovMinimo] = useState(250);

  const affiliates = useMemo(() => aggregateAffiliates(filteredRows), [filteredRows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return affiliates;
    return affiliates.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [affiliates, search]);

  const selectedAff = filtered.find((a) => a.name === selected) ?? null;

  const calc = useMemo(() => {
    if (!selectedAff) return null;
    return calcCPAFixo(selectedAff, variants, netRate);
  }, [selectedAff, variants, netRate]);

  const sensitivity = useMemo(() => {
    if (!calc) return [];
    return AOV_SENSITIVITY_POINTS.map((aov) => {
      const net     = aov * netRate;
      const refAdj  = net * (selectedAff?.reembolso_rate ?? 0);
      const margem  = net - calc.cogs_ponderados - refAdj;
      return { aov, net, margem, cpa_max: margem - margemMinima };
    });
  }, [calc, netRate, margemMinima, selectedAff]);

  const maxSensCpa = useMemo(
    () => sensitivity.reduce((max, r) => Math.max(max, r.cpa_max), 1),
    [sensitivity]
  );

  function updateVariant(idx: number, field: keyof Variant, value: string) {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx
          ? { ...v, [field]: field === "id" || field === "label" ? value : parseFloat(value) || 0 }
          : v
      )
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="cpaf-page">
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
              : "Os dados são carregados automaticamente ao abrir o dashboard."}
          </p>
        </div>
      </div>
    );
  }

  if (affiliates.length === 0) {
    return (
      <div className="cpaf-page">
        <CpaFixoHeader />
        <div className="empty-state">
          <div className="empty-state-icon-row">
            <Users size={36} strokeWidth={1.4} />
            {loading && <LoadingDot />}
          </div>
          <h3>{loading ? "Buscando transações..." : "Sem afiliados com front orders M1/M2/M3"}</h3>
          <p>
            {loading
              ? "Aguarde enquanto os dados são carregados da API Digistore24."
              : "Nenhum produto M1/M2/M3 encontrado no período selecionado. Ajuste o filtro de período."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cpaf-page">
      <CpaFixoHeader />

      {/* ── Config panel ── */}
      <div className="cpaf-config-card">
        <button className="cpaf-config-toggle" onClick={() => setConfigOpen((o) => !o)}>
          <Settings2 size={14} strokeWidth={1.4} />
          <span>Configuração de Variantes e Parâmetros</span>
          {configOpen ? <ChevronUp size={14} strokeWidth={1.4} /> : <ChevronDown size={14} strokeWidth={1.4} />}
        </button>

        {configOpen && (
          <div className="cpaf-config-body">
            <div className="cpaf-config-section">
              <div className="cpaf-config-section-title">Tabela de Variantes</div>
              <table className="cpaf-config-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Label</th>
                    <th>Gross (€)</th>
                    <th>COGs (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id}>
                      <td>
                        <input className="cpaf-config-input cpaf-config-input-sm" value={v.id}
                          onChange={(e) => updateVariant(i, "id", e.target.value)} />
                      </td>
                      <td>
                        <input className="cpaf-config-input" value={v.label}
                          onChange={(e) => updateVariant(i, "label", e.target.value)} />
                      </td>
                      <td>
                        <input className="cpaf-config-input cpaf-config-input-num" type="number" value={v.gross}
                          onChange={(e) => updateVariant(i, "gross", e.target.value)} />
                      </td>
                      <td>
                        <input className="cpaf-config-input cpaf-config-input-num" type="number" value={v.cogs}
                          onChange={(e) => updateVariant(i, "cogs", e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cpaf-config-section">
              <div className="cpaf-config-section-title">Parâmetros Globais</div>
              <div className="cpaf-config-params">
                <div className="cpaf-config-param">
                  <label>Net Rate</label>
                  <input className="cpaf-config-input cpaf-config-input-num" type="number" step="0.001" min="0" max="1"
                    value={netRate} onChange={(e) => setNetRate(parseFloat(e.target.value) || 0)} />
                  <span className="cpaf-config-hint">{(netRate * 100).toFixed(1)}%</span>
                </div>
                <div className="cpaf-config-param">
                  <label>AOV Mínimo Contratual (€)</label>
                  <input className="cpaf-config-input cpaf-config-input-num" type="number" value={aovMinimo}
                    onChange={(e) => setAovMinimo(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main layout ── */}
      <div className="cpaf-main">

        {/* ── Affiliate list ── */}
        <div className="cpaf-aff-panel">
          <div className="cpaf-aff-search-wrap">
            <input className="cpaf-aff-search" placeholder="Buscar afiliado..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="cpaf-aff-count">{filtered.length} afiliado{filtered.length !== 1 ? "s" : ""}</div>
          <div className="cpaf-aff-list">
            {filtered.map((aff) => {
              const isActive    = selected === aff.name;
              const topVariant  = Object.entries(aff.orders_por_variante).sort((a, b) => b[1] - a[1])[0];
              const refColor    = aff.reembolso_rate > 0.10 ? "red" : aff.reembolso_rate > 0.05 ? "amber" : "";
              return (
                <button key={aff.name} className={`cpaf-aff-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelected(isActive ? null : aff.name)}>
                  <div className="cpaf-aff-item-row1">
                    <span className="cpaf-aff-item-name">{aff.name}</span>
                    {topVariant && (
                      <span className="cpaf-aff-item-badge"
                        style={{ background: `${VARIANT_COLORS[topVariant[0]] ?? "#9299A8"}18`, color: VARIANT_COLORS[topVariant[0]] ?? "#9299A8" }}>
                        {topVariant[0]}
                      </span>
                    )}
                  </div>
                  <div className="cpaf-aff-item-row2">
                    <span>{aff.total_orders} orders</span>
                    <span className="cpaf-aff-item-sep">·</span>
                    <span className={`cpaf-aff-item-refund ${refColor}`}>{fmtPct(aff.reembolso_rate)} ref.</span>
                  </div>
                  <MiniMixBar orders={aff.orders_por_variante} total={aff.total_orders} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className="cpaf-detail">
          {!selectedAff && (
            <div className="cpaf-detail-empty">
              <DollarSign size={32} strokeWidth={1.3} />
              <p>Selecione um afiliado para calcular o CPA fixo sustentável</p>
            </div>
          )}

          {selectedAff && calc && (
            <>
              {/* ── Header ── */}
              <div className="cpaf-detail-header">
                <button className="cpaf-back-btn" onClick={() => setSelected(null)}>
                  <ChevronLeft size={14} strokeWidth={1.4} />
                  Voltar
                </button>
                <h2 className="cpaf-detail-name">{selectedAff.name}</h2>
              </div>

              {/* ── Quick stat chips ── */}
              <div className="cpaf-detail-chips">
                <div className="cpaf-chip">
                  <div className="cpaf-chip-label">AOV Gross</div>
                  <div className="cpaf-chip-value">{fmt(calc.aov_gross)}</div>
                </div>
                <div className="cpaf-chip">
                  <div className="cpaf-chip-label">Gross Total</div>
                  <div className="cpaf-chip-value">{fmt(selectedAff.gross_bruto)}</div>
                </div>
                <div className={`cpaf-chip ${selectedAff.reembolso_rate > 0.10 ? "red" : selectedAff.reembolso_rate > 0.05 ? "amber" : ""}`}>
                  <div className="cpaf-chip-label">Reembolso</div>
                  <div className="cpaf-chip-value">{fmtPct(selectedAff.reembolso_rate)}</div>
                </div>
                <div className="cpaf-chip">
                  <div className="cpaf-chip-label">Front Orders</div>
                  <div className="cpaf-chip-value">{selectedAff.total_orders}</div>
                </div>
              </div>

              {/* ── AOV warning ── */}
              {calc.aov_gross < aovMinimo && (
                <div className="cpaf-warning">
                  <TriangleAlert size={15} strokeWidth={1.4} />
                  <span>
                    AOV abaixo do piso mínimo de {fmt(aovMinimo)}. CPA fixo não recomendado sem renegociação.
                  </span>
                </div>
              )}

              {/* ── Mix de variantes ── */}
              <div className="cpaf-section">
                <div className="cpaf-section-title">Mix de Variantes</div>
                <MixBar mix={calc.mix} variants={variants} />
              </div>

              {/* ── Pipeline de cálculo ── */}
              <div className="cpaf-section cpaf-section-no-pad">
                <div className="cpaf-section-title" style={{ padding: "0 20px 12px" }}>Pipeline de Cálculo</div>

                <div className="cpaf-pipeline">
                  {/* Step 1 — AOV */}
                  <div className="cpaf-pipe-item">
                    <span className="cpaf-pipe-item-label">AOV Gross ponderado</span>
                    <div className="cpaf-pipe-item-right">
                      <div className="cpaf-pipe-item-tags">
                        {variants.map((v) => {
                          const pct = calc.mix[v.id] ?? 0;
                          if (pct === 0) return null;
                          return (
                            <span key={v.id} className="cpaf-bd-tag"
                              style={{ borderLeft: `2px solid ${VARIANT_COLORS[v.id] ?? "#9299A8"}` }}>
                              {v.id} {(pct * 100).toFixed(0)}%
                            </span>
                          );
                        })}
                      </div>
                      <span className="cpaf-pipe-item-value">{fmt(calc.aov_gross, 2)}</span>
                    </div>
                  </div>

                  {/* Connector × net rate */}
                  <div className="cpaf-pipe-connector">
                    <span className="cpaf-pipe-connector-op cpaf-op-mult">×</span>
                    <span className="cpaf-pipe-connector-label">
                      Net Rate <strong>{(netRate * 100).toFixed(1)}%</strong>
                    </span>
                    <span className="cpaf-pipe-connector-result">{fmt(calc.net_ponderado, 2)}</span>
                  </div>

                  {/* Connector − COGs */}
                  <div className="cpaf-pipe-connector">
                    <span className="cpaf-pipe-connector-op cpaf-op-sub">−</span>
                    <span className="cpaf-pipe-connector-label">
                      COGs ponderados
                    </span>
                    <span className="cpaf-pipe-connector-result cpaf-pipe-connector-neg">{fmt(calc.cogs_ponderados, 2)}</span>
                  </div>

                  {/* Step 2 — Margem Bruta */}
                  <div className="cpaf-pipe-item cpaf-pipe-item-subtotal">
                    <span className="cpaf-pipe-item-label">
                      <span className="cpaf-pipe-eq">=</span> Margem Bruta
                    </span>
                    <span className="cpaf-pipe-item-value">{fmt(calc.margem_bruta, 2)}</span>
                  </div>

                  {/* Connector − reembolso */}
                  <div className="cpaf-pipe-connector">
                    <span className="cpaf-pipe-connector-op cpaf-op-sub">−</span>
                    <span className="cpaf-pipe-connector-label">
                      Reembolso <strong>{fmtPct(selectedAff.reembolso_rate)}</strong>
                    </span>
                    <span className="cpaf-pipe-connector-result cpaf-pipe-connector-neg">{fmt(calc.perda_reembolso, 2)}</span>
                  </div>

                  {/* Step 3 — Margem Final */}
                  <div className="cpaf-pipe-item cpaf-pipe-item-total">
                    <span className="cpaf-pipe-item-label">
                      <span className="cpaf-pipe-eq cpaf-pipe-eq-total">=</span> Margem Disponível Final
                    </span>
                    <span className="cpaf-pipe-item-value cpaf-pipe-item-value-total">{fmt(calc.margem_final, 2)}</span>
                  </div>
                </div>
              </div>

              {/* ── CPA Máximo ── */}
              <div className="cpaf-section">
                <div className="cpaf-section-title">CPA Fixo Máximo</div>

                {/* Margem stepper */}
                <div className="cpaf-margin-control">
                  <span className="cpaf-margin-control-label">Margem mínima alvo</span>
                  <div className="cpaf-margin-stepper">
                    <button
                      onClick={() => setMargemMinima((m) => Math.max(1, m - 1))}
                      disabled={margemMinima <= 1}
                    >
                      <Minus size={12} strokeWidth={2} />
                    </button>
                    <span>{fmt(margemMinima, 0)}</span>
                    <button
                      onClick={() => setMargemMinima((m) => Math.min(100, m + 1))}
                      disabled={margemMinima >= 100}
                    >
                      <Plus size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* CPA scenario cards */}
                <div className="cpaf-cpa-result-grid">
                  {[margemMinima - 5, margemMinima, margemMinima + 5]
                    .filter((m) => m >= 1 && m <= 100)
                    .map((m) => {
                      const cpa       = calc.margem_final - m;
                      const pctGross  = calc.aov_gross > 0 ? cpa / calc.aov_gross : 0;
                      const isMain    = m === margemMinima;
                      const isNeg     = cpa < 0;
                      return (
                        <div key={m} className={`cpaf-cpa-card ${isMain ? "cpaf-cpa-card-main" : ""} ${isNeg && isMain ? "cpaf-cpa-card-neg" : ""}`}>
                          <div className="cpaf-cpa-card-label">Margem {fmt(m, 0)}</div>
                          <div className="cpaf-cpa-card-value">{fmt(cpa, 0)}</div>
                          <div className="cpaf-cpa-card-sub">
                            {(pctGross * 100).toFixed(1)}% do gross
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="cpaf-aov-note">
                  AOV mínimo contratual: <strong>{fmt(aovMinimo, 0)}</strong>
                  {calc.aov_gross >= aovMinimo && (
                    <span className="cpaf-aov-ok">✓ acima do piso</span>
                  )}
                </div>
              </div>

              {/* ── Tabela de sensibilidade ── */}
              <div className="cpaf-section">
                <div className="cpaf-section-title">Cláusula de AOV — Sensibilidade</div>
                <div className="cpaf-sensitivity-note">
                  COGs fixos no mix atual. Margem mínima: {fmt(margemMinima, 0)}.
                </div>
                <table className="cpaf-sens-table">
                  <thead>
                    <tr>
                      <th>AOV Gross</th>
                      <th>Net ({(netRate * 100).toFixed(1)}%)</th>
                      <th>Margem disp.</th>
                      <th>CPA máx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                    const closestDiff = sensitivity.reduce(
                      (min, r) => Math.min(min, Math.abs(r.aov - calc.aov_gross)),
                      Infinity
                    );
                    return sensitivity.map((row) => {
                      const isActive = Math.abs(row.aov - calc.aov_gross) < closestDiff + 1;
                      const isBelowMin  = row.aov < aovMinimo;
                      const barPct      = Math.max(0, (row.cpa_max / maxSensCpa) * 100);
                      return (
                        <tr key={row.aov}
                          className={`${isActive ? "cpaf-sens-row-active" : ""} ${isBelowMin ? "cpaf-sens-row-warn" : ""}`}>
                          <td>
                            {fmt(row.aov, 0)}
                            {isBelowMin && (
                              <TriangleAlert size={10} strokeWidth={1.4}
                                style={{ marginLeft: 4, verticalAlign: "middle", color: "var(--amber)" }} />
                            )}
                          </td>
                          <td>{fmt(row.net, 0)}</td>
                          <td>{fmt(row.margem, 0)}</td>
                          <td>
                            <div className="cpaf-sens-cpa-wrap">
                              {row.cpa_max > 0 && (
                                <div className="cpaf-sens-cpa-bar"
                                  style={{ width: `${barPct.toFixed(0)}%` }} />
                              )}
                              <span className={row.cpa_max < 0 ? "cpaf-bd-neg" : ""}>{fmt(row.cpa_max, 0)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
