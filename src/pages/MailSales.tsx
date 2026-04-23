import React, { useMemo } from "react";
import {
  Mail,
  Percent,
  CircleDollarSign,
  ShoppingCart,
  BadgeDollarSign,
  RotateCcw,
} from "lucide-react";
import KPICard from "../components/KPICard";
import LoadingDot from "../components/LoadingDot";
import { GrossEvolutionChart, PRODUCT_COLORS } from "../components/Charts";
import {
  type TransactionRow,
  isPayment,
  isRefund,
  isChargeback,
  isMaileonardo,
  getProductBase,
  formatEur,
  formatPct,
  formatInt,
} from "../lib/transactions";

// ─── Metrics ──────────────────────────────────────────────────────────────────
type MailMetrics = {
  gross: number;
  grossPct: number;
  frontOrders: number;
  aovPerOrder: number;
  refundAmt: number;
  refundPct: number;
  productMix: { name: string; gross: number; orders: number; pct: number }[];
  dailyGross: { date: string; value: number }[];
};

function computeMailMetrics(rows: TransactionRow[], totalGross: number): MailMetrics {
  const mailRows = rows.filter((t) => isMaileonardo(t.affiliate));

  const payRows = mailRows.filter(isPayment);
  const refRows = mailRows.filter((t) => isRefund(t) || isChargeback(t));

  const gross = payRows.reduce((s, t) => s + t.grossAmount, 0);
  const netTotal = payRows.reduce((s, t) => s + t.netAmount, 0);
  const refundAmt = refRows.reduce((s, t) => s + t.grossAmount, 0);
  const frontOrders = payRows.filter((t) => t.upsellNo === 0).length;
  // Product mix (front orders only)
  const prodMap = new Map<string, { gross: number; orders: number }>();
  for (const t of payRows.filter((t) => t.upsellNo === 0)) {
    const base = getProductBase(t.productName);
    if (!base) continue;
    const e = prodMap.get(base) ?? { gross: 0, orders: 0 };
    e.gross += t.grossAmount;
    e.orders += 1;
    prodMap.set(base, e);
  }
  const productMix = Array.from(prodMap.entries())
    .map(([name, d]) => ({
      name,
      gross: d.gross,
      orders: d.orders,
      pct: gross > 0 ? d.gross / gross : 0,
    }))
    .sort((a, b) => b.gross - a.gross);

  // Daily gross
  const dailyMap = new Map<string, number>();
  for (const t of payRows) {
    const dk = t.date.toISOString().split("T")[0]!;
    dailyMap.set(dk, (dailyMap.get(dk) ?? 0) + t.grossAmount);
  }
  const dailyGross = Array.from(dailyMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    gross,
    grossPct: totalGross > 0 ? gross / totalGross : 0,
    frontOrders,
    aovPerOrder: frontOrders > 0 ? netTotal / frontOrders : 0,
    refundAmt,
    refundPct: gross > 0 ? refundAmt / gross : 0,
    productMix,
    dailyGross,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MailSalesProps {
  filteredRows: TransactionRow[];
  loading: boolean;
}

const MailSalesPage: React.FC<MailSalesProps> = ({ filteredRows, loading }) => {
  const totalGrossBruto = useMemo(
    () =>
      filteredRows
        .filter((t) => isPayment(t) && t.upsellNo === 0)
        .reduce((s, t) => s + t.grossAmount, 0),
    [filteredRows]
  );

  const mailMetrics = useMemo(
    () => computeMailMetrics(filteredRows, totalGrossBruto),
    [filteredRows, totalGrossBruto]
  );

  if (filteredRows.length === 0 || mailMetrics.frontOrders === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon-row">
          <Mail size={36} strokeWidth={1.4} />
          {loading && <LoadingDot />}
        </div>
        <h3>{loading ? "Buscando transações..." : "Sem dados do Maileonardo"}</h3>
        <p>
          {loading
            ? "Aguarde enquanto os dados são carregados da API Digistore24."
            : "Nenhuma transação com afiliado \"maileonardo\" encontrada no período selecionado."}
        </p>
      </div>
    );
  }

  const m = mailMetrics;

  return (
    <>
      {/* ── Header ── */}
      <div className="section-header">
        <h2>Recuperação de Carrinho — Maileonardo</h2>
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-group">
        <div className="kpi-group-label">Impacto na Operação</div>
        <div className="kpi-grid">
          <KPICard
            icon={Percent}
            label="% do Gross Total"
            value={formatPct(m.grossPct * 100)}
            info="Participação do Maileonardo no gross bruto total da operação no período. Mede o impacto do recuperador de carrinho na receita geral."
            color="green"
          />
          <KPICard
            icon={CircleDollarSign}
            label="Gross Maileonardo"
            value={formatEur(m.gross)}
            info="Receita bruta gerada pelo Maileonardo (afiliado recuperador de carrinho abandonado) no período selecionado."
            color="green"
          />
          <KPICard
            icon={ShoppingCart}
            label="Vendas Recuperadas"
            value={formatInt(m.frontOrders)}
            info="Número de pedidos frontais (upsell_no=0) recuperados pelo Maileonardo no período."
          />
          <KPICard
            icon={BadgeDollarSign}
            label="Valor Médio por Venda"
            value={formatEur(m.aovPerOrder)}
            info="Total líquido sem IVA (front + upsells + bumps) por pedido recuperado pelo Maileonardo. Indica o ticket médio completo dos carrinhos abandonados convertidos."
          />
          <KPICard
            icon={RotateCcw}
            label="Taxa de Reembolso"
            value={formatPct(m.refundPct * 100)}
            info="Taxa de reembolso específica das vendas do Maileonardo (gross reembolsos ÷ gross pagamentos)."
            color={m.refundPct > 0.10 ? "red" : m.refundPct > 0.05 ? "orange" : ""}
          />
        </div>
      </div>

      {/* ── Mix por produto & Gross share visual ── */}
      <div className="section-header">
        <h2>Mix de Produtos &amp; Impacto no Gross</h2>
      </div>

      <div className="scorecard-row">
        {/* Product mix table */}
        <div className="scorecard-card">
          <div className="mail-section-title">Mix de Produtos — Maileonardo</div>
          <table className="mail-mix-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Vendas</th>
                <th>Gross</th>
                <th>% do Mix</th>
              </tr>
            </thead>
            <tbody>
              {m.productMix.map((row) => (
                <tr key={row.name}>
                  <td>
                    <span
                      className="mail-prod-dot"
                      style={{ background: PRODUCT_COLORS[row.name] }}
                    />
                    {row.name}
                  </td>
                  <td>{formatInt(row.orders)}</td>
                  <td>{formatEur(row.gross)}</td>
                  <td>
                    <div className="mail-pct-bar-wrap">
                      <div
                        className="mail-pct-bar"
                        style={{
                          width: `${(row.pct * 100).toFixed(1)}%`,
                          background: PRODUCT_COLORS[row.name] ?? "var(--green)",
                        }}
                      />
                      <span>{(row.pct * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gross share card */}
        <div className="scorecard-card">
          <div className="mail-section-title">Participação no Gross Total</div>
          <div className="mail-gross-share">
            <div className="mail-gross-share-bar-wrap">
              <div
                className="mail-gross-share-bar"
                style={{ width: `${Math.min(m.grossPct * 100, 100).toFixed(1)}%` }}
              />
              <div
                className="mail-gross-share-bar mail-gross-share-bar-rest"
                style={{ width: `${Math.min((1 - m.grossPct) * 100, 100).toFixed(1)}%` }}
              />
            </div>
            <div className="mail-gross-share-legend">
              <div className="mail-gross-share-item">
                <span className="mail-gross-share-dot mail-gross-share-dot-mail" />
                <span>Maileonardo</span>
                <strong>{(m.grossPct * 100).toFixed(1)}%</strong>
                <span className="mail-gross-share-eur">{formatEur(m.gross)}</span>
              </div>
              <div className="mail-gross-share-item">
                <span className="mail-gross-share-dot mail-gross-share-dot-rest" />
                <span>Resto da operação</span>
                <strong>{((1 - m.grossPct) * 100).toFixed(1)}%</strong>
                <span className="mail-gross-share-eur">
                  {formatEur(totalGrossBruto - m.gross)}
                </span>
              </div>
              <div className="mail-gross-share-total">
                <span>Total</span>
                <strong>{formatEur(totalGrossBruto)}</strong>
              </div>
            </div>
          </div>

          {/* Per-product contribution to TOTAL gross */}
          <div className="mail-section-title" style={{ marginTop: 20 }}>
            Contribuição por Produto (vs. Gross Total)
          </div>
          <div className="mail-prod-contrib">
            {m.productMix.map((row) => {
              const contribPct = totalGrossBruto > 0 ? row.gross / totalGrossBruto : 0;
              return (
                <div key={row.name} className="mail-prod-contrib-row">
                  <span
                    className="mail-prod-dot"
                    style={{ background: PRODUCT_COLORS[row.name] }}
                  />
                  <span className="mail-prod-contrib-name">{row.name}</span>
                  <div className="mail-pct-bar-wrap mail-pct-bar-wrap-sm">
                    <div
                      className="mail-pct-bar"
                      style={{
                        width: `${Math.min(contribPct * 100 * 5, 100).toFixed(1)}%`,
                        background: PRODUCT_COLORS[row.name] ?? "var(--green)",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="mail-prod-contrib-val">
                    {(contribPct * 100).toFixed(2)}%
                  </span>
                  <span className="mail-prod-contrib-eur">{formatEur(row.gross)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Gross evolution chart ── */}
      {m.dailyGross.length > 1 && (
        <>
          <div className="section-header">
            <h2>Evolução do Gross — Maileonardo</h2>
          </div>
          <GrossEvolutionChart data={m.dailyGross} periodDays={undefined} />
        </>
      )}

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>
    </>
  );
};

export default MailSalesPage;
