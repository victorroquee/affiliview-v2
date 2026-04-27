import React, { useMemo } from "react";
import { X } from "lucide-react";
import {
  type AffiliateRow,
  type AffiliateRanking,
  type AffiliateRankingInfo,
  type TransactionRow,
  formatEur,
  formatPct,
  formatInt,
  TIER_MIN,
  computeAffiliateUpsells,
} from "../lib/transactions";

const RANKING_LABEL: Record<AffiliateRanking, string> = {
  "Tier 1": "Tier 1", "Tier 2": "Tier 2", "Tier 3": "Tier 3",
  "Ativo": "Ativo", "Em Rampa": "Em Rampa", "Inativo": "Inativo",
};
const RANKING_CLASS: Record<AffiliateRanking, string> = {
  "Tier 1": "tier-1", "Tier 2": "tier-2", "Tier 3": "tier-3",
  "Ativo": "tier-ativo", "Em Rampa": "tier-em-rampa", "Inativo": "tier-inativo",
};
const TIER_ORDER: AffiliateRanking[] = ["Tier 1", "Tier 2", "Tier 3", "Ativo", "Em Rampa", "Inativo"];

function nextTier(r: AffiliateRanking): AffiliateRanking | null {
  const idx = TIER_ORDER.indexOf(r);
  return idx > 0 ? TIER_ORDER[idx - 1]! : null;
}

function fmtDay(iso: string): string {
  if (!iso || !iso.includes("-")) return "?";
  const [, m, d] = iso.split("-");
  return `${Number(d ?? 1)}/${Number(m ?? 1)}`;
}

function daysAgo(iso: string): number {
  const then = new Date(iso + "T00:00:00Z").getTime();
  const now  = Date.now();
  return Math.floor((now - then) / 86400000);
}

function formatDaysAgo(iso: string): string {
  const d = daysAgo(iso);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  return `${d} dias atrás`;
}

function fmtK(v: number): string {
  if (v === 0) return "—";
  if (v >= 10000) return `€${(v / 1000).toFixed(0)}k`;
  if (v >= 1000)  return `€${(v / 1000).toFixed(1)}k`;
  return `€${Math.round(v)}`;
}

// Color each day square by the highest tier it reaches
function dayTierClass(t1: boolean, t2: boolean, t3: boolean): string {
  if (t1) return "day-t1";
  if (t2) return "day-t2";
  if (t3) return "day-t3";
  return "day-none";
}

interface AffiliateDrawerProps {
  affiliate:    AffiliateRow | null;
  rankingInfo:  AffiliateRankingInfo | null;
  filteredRows: TransactionRow[];
  onClose:      () => void;
}

const AffiliateDrawer: React.FC<AffiliateDrawerProps> = ({ affiliate, rankingInfo, filteredRows, onClose }) => {
  const open = affiliate !== null;
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const upsellData = useMemo(() => {
    if (!affiliate || filteredRows.length === 0) return null;
    return computeAffiliateUpsells(filteredRows, affiliate.name);
  }, [affiliate, filteredRows]);

  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  if (!affiliate) return null;

  const ranking: AffiliateRanking = rankingInfo?.ranking ?? "Inativo";
  const margemColor = affiliate.margem >= 10 ? "green" : affiliate.margem >= 5 ? "orange" : "red";
  const next    = nextTier(ranking);
  const nextMin = next && TIER_MIN[next] != null ? TIER_MIN[next]! : null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />

      <div className={`aff-drawer${open ? " open" : ""}`}>

        {/* ── Header ── */}
        <div className="aff-drawer-header">
          <div className="aff-drawer-header-info">
            <div className="aff-drawer-name">{affiliate.name}</div>
            <div className="aff-drawer-badges">
              <span className={`tier-badge ${RANKING_CLASS[ranking]}`}>{RANKING_LABEL[ranking]}</span>
              <span className={`status-badge ${affiliate.status.toLowerCase()}`}>{affiliate.status}</span>
            </div>
          </div>
          <button className="aff-drawer-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="aff-drawer-body">

          {/* ── Métricas ── */}
          <div className="aff-drawer-section">
            <div className="aff-drawer-section-title">Período selecionado</div>
            <div className="aff-drawer-metrics-grid">
              {[
                { label: "Gross",        value: formatEur(affiliate.gross),      cls: "green" },
                { label: "Earnings",     value: formatEur(affiliate.earnings),   cls: "" },
                { label: "Valor Líq.",   value: formatEur(affiliate.valorLiq),   cls: affiliate.valorLiq < 0 ? "red" : "green" },
                { label: "Vendas",       value: formatInt(affiliate.sales),      cls: "" },
                { label: "Ticket Médio", value: formatEur(affiliate.aov),        cls: "" },
                { label: "CPA",          value: formatEur(affiliate.cpa),        cls: "" },
                { label: "Margem",       value: formatPct(affiliate.margem),     cls: margemColor },
                { label: "Refund+CB",    value: formatPct(affiliate.refundCbPct), cls: affiliate.refundCbPct > 8 ? "red" : affiliate.refundCbPct > 0 ? "orange" : ""},
              ].map(({ label, value, cls }) => (
                <div key={label} className="aff-drawer-metric">
                  <div className="aff-drawer-metric-label">{label}</div>
                  <div className={`aff-drawer-metric-value ${cls}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tier Analysis ── */}
          {rankingInfo ? (
            <div className="aff-drawer-section">
              <div className="aff-drawer-section-title">
                Análise de Tier
                <span className="aff-drawer-window-label">
                  {fmtDay(rankingInfo.windowStart)} → {fmtDay(rankingInfo.windowEnd)}
                </span>
              </div>

              {/* 7 day squares */}
              <div className="day-squares-row">
                {rankingInfo.days.map((day, idx) => (
                  <div key={day.date} className={`day-square ${dayTierClass(day.t1, day.t2, day.t3)}`}>
                    <span className="day-square-date">{fmtDay(day.date)}</span>
                    <span className="day-square-val">{fmtK(day.gross)}</span>
                    {idx === 2 && <div className="day-square-divider" />}
                  </div>
                ))}
              </div>
              <div className="day-squares-legend">
                <span>D1–D3 críticos (todos devem passar)</span>
                <span>D4–D7 flexíveis (3 de 4)</span>
              </div>

              {/* Tier progress bars */}
              <div className="tier-bars-list">
                {(
                  [
                    { key: "t1" as const, label: "Tier 1", cls: "tier-1", threshold: 15000, field: "t1" as const },
                    { key: "t2" as const, label: "Tier 2", cls: "tier-2", threshold: 5000,  field: "t2" as const },
                    { key: "t3" as const, label: "Tier 3", cls: "tier-3", threshold: 1000,  field: "t3" as const },
                  ] as const
                ).map(({ label, cls, threshold, field }) => {
                  const vals   = rankingInfo.days.map((d) => d[field]);
                  const first3 = vals.slice(0, 3).every(Boolean);
                  const last4n = vals.slice(3).filter(Boolean).length;
                  const passes = first3 && last4n >= 3;
                  const total  = vals.filter(Boolean).length;
                  const pct    = Math.round((total / 7) * 100);
                  const isActive = ranking === label;

                  return (
                    <div key={label} className={`tier-bar-row${isActive ? " active" : ""}`}>
                      <div className="tier-bar-left">
                        <span className={`tier-badge ${cls}`}>{label}</span>
                        <span className="tier-bar-threshold">≥{formatEur(threshold)}/dia</span>
                      </div>
                      <div className="tier-bar-track">
                        {/* The fill */}
                        <div
                          className={`tier-bar-fill ${passes ? "pass" : "fail"}`}
                          style={{ width: `${pct}%` }}
                        />
                        {/* Minimum marker at 6/7 ≈ 85.7% */}
                        <div className="tier-bar-min-marker" style={{ left: "85.7%" }} />
                      </div>
                      <div className={`tier-bar-result ${passes ? "pass" : "fail"}`}>
                        <span className="tier-bar-result-icon">{passes ? "✓" : "✗"}</span>
                        <span className="tier-bar-result-count">{total}/7</span>
                      </div>
                    </div>
                  );
                })}

                {/* Ativo row */}
                {(() => {
                  const sales  = rankingInfo.frontSalesInWindow;
                  const passes = sales >= 10;
                  const pct    = Math.min(Math.round((sales / 10) * 100), 100);
                  const isActive = ranking === "Ativo";
                  return (
                    <div className={`tier-bar-row${isActive ? " active" : ""}`}>
                      <div className="tier-bar-left">
                        <span className="tier-badge tier-ativo">Ativo</span>
                        <span className="tier-bar-threshold">≥10 vendas</span>
                      </div>
                      <div className="tier-bar-track">
                        <div className={`tier-bar-fill ${passes ? "pass" : "fail"}`} style={{ width: `${pct}%` }} />
                        <div className="tier-bar-min-marker" style={{ left: "100%" }} />
                      </div>
                      <div className={`tier-bar-result ${passes ? "pass" : "fail"}`}>
                        <span className="tier-bar-result-icon">{passes ? "✓" : "✗"}</span>
                        <span className="tier-bar-result-count">{sales}/10</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Em Rampa row */}
                {(() => {
                  const sales  = rankingInfo.frontSalesInWindow;
                  const passes = sales >= 1 && sales < 10;
                  const pct    = Math.min(Math.round((sales / 9) * 100), 100);
                  const isActive = ranking === "Em Rampa";
                  return (
                    <div className={`tier-bar-row${isActive ? " active" : ""}`}>
                      <div className="tier-bar-left">
                        <span className="tier-badge tier-em-rampa">Em Rampa</span>
                        <span className="tier-bar-threshold">1–9 vendas</span>
                      </div>
                      <div className="tier-bar-track">
                        <div className={`tier-bar-fill ${passes ? "pass" : "fail"}`} style={{ width: `${pct}%` }} />
                        <div className="tier-bar-min-marker" style={{ left: "100%" }} />
                      </div>
                      <div className={`tier-bar-result ${passes ? "pass" : "fail"}`}>
                        <span className="tier-bar-result-icon">{passes ? "✓" : "✗"}</span>
                        <span className="tier-bar-result-count">{sales}/9</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Next tier */}
              {next && nextMin !== null && (
                <div className="aff-drawer-next-tier">
                  <span className="aff-next-tier-label">Próximo</span>
                  <span className={`tier-badge ${RANKING_CLASS[next]}`}>{RANKING_LABEL[next]}</span>
                  <span className="aff-next-tier-desc">
                    {next === "Ativo"
                      ? `Faltam ${Math.max(0, 10 - (rankingInfo.frontSalesInWindow))} vendas em 7 dias`
                      : `≥${formatEur(nextMin)}/dia consistente por 7 dias`}
                  </span>
                </div>
              )}

              {/* Ultima venda for Inativo affiliates */}
              {ranking === "Inativo" && rankingInfo?.lastFrontSaleDate && (
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-3)" }}>
                  Última venda: {formatDaysAgo(rankingInfo.lastFrontSaleDate)}
                </div>
              )}
            </div>
          ) : (
            <div className="aff-drawer-section">
              <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sem dados para os últimos 7 dias.</p>
            </div>
          )}

          {/* ── Upsells Vendidos ── */}
          {upsellData && upsellData.upsells.length > 0 && (
            <div className="aff-drawer-section">
              <div className="aff-drawer-section-title">Upsells Vendidos</div>
              <table style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Produto</th>
                    <th style={{ textAlign: "right" }}>Qtd</th>
                    <th style={{ textAlign: "right" }}>Gross</th>
                    <th style={{ textAlign: "right" }}>AOV +</th>
                    <th style={{ textAlign: "right" }}>% AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {upsellData.upsells.map((u) => (
                    <tr key={u.productName}>
                      <td>{u.productName}</td>
                      <td className="num">{u.quantity}</td>
                      <td className="num">{formatEur(u.gross)}</td>
                      <td className="num">{formatEur(u.aovContribution)}</td>
                      <td className="num">{formatPct(u.aovContributionPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
                AOV total: {formatEur(upsellData.totalAOV)} · {upsellData.frontSalesCount} vendas front · {formatEur(upsellData.totalUpsellGross)} em upsells
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default AffiliateDrawer;
