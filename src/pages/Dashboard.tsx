import React, { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  TrendingUp,
  Wallet,
  ShoppingCart,
  RotateCcw,
  Zap,
  Award,
  Users,
  BarChart2,
  UserX,
  FileDown,
} from "lucide-react";
import KPICard from "../components/KPICard";
import LoadingDot from "../components/LoadingDot";
import { GrossEvolutionChart, ProductMixChart, RefundByProductChart, PRODUCT_COLORS } from "../components/Charts";
import { ProductSummaryTable, BundlePerformanceTable, AffiliateTable } from "../components/ProductTable";
import {
  type TransactionRow,
  type AffiliateRow,
  type AffiliateRankingInfo,
  type PeriodMetrics,
  type UpsellProductRow,
  computeFromFiltered,
  computeAffiliateRankings,
  computeBackendProducts,
  isMaileonardo,
  formatEur,
  formatPct,
  formatInt,
} from "../lib/transactions";
import AffiliateDrawer from "../components/AffiliateDrawer";
import { generateKPIReport } from "../lib/pdfExport";
import { getRefundColor } from "../utils/colorThresholds";

interface DashboardProps {
  filteredRows: TransactionRow[];
  allRows:      TransactionRow[];
  periodDays:   number | undefined;
  loading:      boolean;
  error:        string | null;
}

const Dashboard: React.FC<DashboardProps> = ({
  filteredRows,
  allRows,
  periodDays,
  loading,
  error,
}) => {
  const [productFilter, setProductFilter] = useState<string>("all");
  const [drawerAffiliate, setDrawerAffiliate] = useState<AffiliateRow | null>(null);

  // Close drawer when period filter changes to prevent stale mixed-period data (DRAW-02)
  useEffect(() => {
    setDrawerAffiliate(null);
  }, [periodDays]);

  const metrics: PeriodMetrics | null = useMemo(() => {
    if (filteredRows.length === 0) return null;
    return computeFromFiltered(filteredRows, periodDays);
  }, [filteredRows, periodDays]);

  // Exclude Maileonardo from regular affiliate table
  const affiliatesWithoutMail = useMemo(() => {
    if (!metrics) return [];
    return metrics.topAffiliates.filter((a) => !isMaileonardo(a.name));
  }, [metrics]);

  const rankings = useMemo(
    () => computeAffiliateRankings(allRows.filter((r) => !isMaileonardo(r.affiliate))),
    [allRows]
  );

  const activosCount = useMemo(() => {
    return [...rankings.values()].filter(r =>
      ["Tier 1", "Tier 2", "Tier 3", "Ativo"].includes(r.ranking)
    ).length;
  }, [rankings]);

  const emRampaCount = useMemo(() => {
    return [...rankings.values()].filter(r => r.ranking === "Em Rampa").length;
  }, [rankings]);

  const inativoCount = useMemo(() => {
    return [...rankings.values()].filter(r => r.ranking === "Inativo").length;
  }, [rankings]);

  const rankingWindowLabel = useMemo(() => {
    const values = [...rankings.values()];
    if (values.length === 0) return null;
    const first = values[0]!;
    const fmt = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
    return `${fmt(first.windowStart)} \u2014 ${fmt(first.windowEnd)}`;
  }, [rankings]);

  const drawerRanking: AffiliateRankingInfo | null =
    drawerAffiliate ? (rankings.get(drawerAffiliate.name) ?? null) : null;

  const backendProducts = useMemo((): UpsellProductRow[] => {
    if (filteredRows.length === 0) return [];
    return computeBackendProducts(filteredRows);
  }, [filteredRows]);

  const filteredProductSummary = useMemo(() => {
    if (!metrics) return [];
    if (productFilter === "all") return metrics.productSummary;
    return metrics.productSummary.filter((p) => p.product === productFilter);
  }, [metrics, productFilter]);

  const filteredBundles = useMemo(() => {
    if (!metrics) return [];
    if (productFilter === "all") return metrics.bundlePerformance;
    return metrics.bundlePerformance.filter((b) => b.product === productFilter);
  }, [metrics, productFilter]);

  const products = useMemo(() => {
    if (!metrics) return [];
    return metrics.productSummary.map((p) => p.product);
  }, [metrics]);

  if (!metrics) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon-row">
          <BarChart2 size={36} strokeWidth={1.4} />
          {loading && <LoadingDot />}
        </div>
        <h3>{loading ? "Buscando transações..." : "Nenhum dado carregado"}</h3>
        <p>
          {error
            ? "Verifique a conexão com a API Digistore24 e tente novamente."
            : loading
            ? "Aguarde enquanto os dados são carregados da API Digistore24."
            : `Clique em "Conectar" para carregar os dados da sua conta Digistore24.`}
        </p>
      </div>
    );
  }

  const handleExportPDF = () => {
    if (!metrics) return;
    const dates = filteredRows.map((r) => r.date);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const fmt = (d: Date) =>
      d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const periodLabel = `${fmt(minDate)} – ${fmt(maxDate)}${periodDays ? ` (${periodDays}d)` : ""}`;

    generateKPIReport({
      metrics,
      affiliates: affiliatesWithoutMail,
      rankings,
      periodLabel,
      activosCount,
      emRampaCount,
      inativoCount,
    });
  };

  return (
    <>
      {/* ── Export PDF ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className="btn-export-pdf" onClick={handleExportPDF}>
          <FileDown size={14} strokeWidth={1.6} />
          Exportar PDF
        </button>
      </div>

      {/* ── Bloco: Receita ── */}
          <div className="kpi-group">
            <div className="kpi-group-label">Receita</div>
            <div className="kpi-grid">
              <KPICard
                icon={CircleDollarSign}
                label="Gross Revenue"
                value={formatEur(metrics.gross)}
                info="Receita bruta de todos os pagamentos (front + upsells + bumps). Alinhado com Gross Amount do dashboard Digistore24."
                color="green"
              />
              <KPICard
                icon={TrendingUp}
                label="Earnings"
                value={formatEur(metrics.earnings)}
                info="Ganhos do produtor de todos os pagamentos (front + upsells) menos deducoes de reembolsos e chargebacks. Alinhado com Your Earnings do dashboard Digistore24."
              />
              <KPICard
                icon={Wallet}
                label="Valor Líquido"
                value={formatEur(metrics.valorLiq)}
                info="Earnings menos COGS e custo de capital: front paga produto + frete; upsells pagam só produto (mesmo pacote); capital ~0,33% do gross (reserva Digistore 10% por 60 dias). Lucro operacional direto após custos variáveis."
                color="green"
              />
              <KPICard
                icon={ShoppingCart}
                label="Ticket Médio (AOV)"
                value={formatEur(metrics.aov)}
                info="Total bruto com IVA (front + upsells + bumps) dividido pelo número de pedidos front. Mede o valor médio total por pedido, incluindo IVA."
              />
              <KPICard
                icon={RotateCcw}
                label="Reembolso + Chargeback"
                value={formatPct(metrics.refundCbPct)}
                info={`Taxa value-based: (gross reembolsos + gross chargebacks) ÷ gross revenue total. Alerta: laranja ≤8%, vermelho >8%. Reembolso: ${formatPct(metrics.refundPct)} · Chargeback: ${formatPct(metrics.chargebackPct)}`}
                color={getRefundColor(metrics.refundCbPct)}
              />
            </div>
          </div>

          {/* ── Bloco: Atividade ── */}
          <div className="kpi-group">
            <div className="kpi-group-label">
              Atividade
              {rankingWindowLabel && (
                <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-3)", marginLeft: 8 }}>
                  {rankingWindowLabel}
                </span>
              )}
            </div>
            <div className="kpi-grid-5">
              <KPICard icon={ShoppingCart} label="Vendas Totais"     value={formatInt(metrics.sales)}                     info="Contagem de pagamentos aprovados com upsell_no=0 (pedidos principais/frontais). Upsells e bump orders não são contados aqui." />
              <KPICard icon={Zap}          label="Ativados ≥ €2K"    value={formatInt(metrics.activated)}                 info="Afiliados cujo affiliate_amount acumulado no período é ≥ €2.000. Indica afiliados operando em escala ativa com alto volume de comissões." />
              <KPICard icon={Award}        label="Novos Qualificados" value={formatInt(metrics.novosQualificados)}          info="Afiliados com média diária de gross ≥ €1.000/dia no período. São candidatos a promoção de CPA ou condições especiais de parceria." />
              <KPICard
                icon={Users}
                label="Afiliados Ativos"
                value={formatInt(activosCount)}
                info={`Afiliados com Tier 1/2/3 ou Ativo (≥10 vendas/7d). Breakdown: ${activosCount} Ativos · ${emRampaCount} Em Rampa · ${inativoCount} Inativos`}
              />
              <KPICard
                icon={UserX}
                label="Inativos no Período"
                value={formatInt(inativoCount)}
                info="Afiliados cuja ultima venda front foi ha mais de 5 dias. Veja a lista completa na aba Afiliados → Inativos."
              />
            </div>
          </div>

          {/* ── Top Afiliados & Reembolsos ── */}
          <div className="section-header">
            <h2>Top Afiliados &amp; Reembolsos por Produto</h2>
          </div>

          <div className="scorecard-row">
            <AffiliateTable
              data={affiliatesWithoutMail}
              rankings={rankings}
              onSelectAffiliate={setDrawerAffiliate}
            />
            <div className="scorecard-card">
              <RefundByProductChart data={metrics.refundByProduct} />
            </div>
          </div>

          {/* ── Evolução & Mix ── */}
          <div className="section-header">
            <h2>Evolução &amp; Mix de Receita</h2>
          </div>

          <div className="charts-row">
            <GrossEvolutionChart data={metrics.dailyGross} periodDays={periodDays} />
            <ProductMixChart data={metrics.productMix} />
          </div>

          {/* ── Performance por Produto (Front) ── */}
          <div className="section-header">
            <h2>Performance por Produto — Vendas Front</h2>
          </div>

          <div className="product-tabs">
            <span>Filtrar por produto:</span>
            <button
              className={`product-tab ${productFilter === "all" ? "active" : ""}`}
              onClick={() => setProductFilter("all")}
            >
              Todos
            </button>
            {products.map((p) => (
              <button
                key={p}
                className={`product-tab ${productFilter === p ? "active" : ""}`}
                onClick={() => setProductFilter(p)}
              >
                {PRODUCT_COLORS[p] && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: PRODUCT_COLORS[p],
                      marginRight: 6,
                      flexShrink: 0,
                      verticalAlign: "middle",
                    }}
                  />
                )}
                {p}
              </button>
            ))}
          </div>

      <ProductSummaryTable data={filteredProductSummary} />
      <BundlePerformanceTable data={filteredBundles} upsellUnattributed={productFilter === "all" ? metrics?.bundleUpsellUnattributed : undefined} />

      {backendProducts.length > 0 && (
        <div className="table-container">
          <div className="table-header">
            <h3>Resultados de Backend (Upsells/Downsells)</h3>
            <p>Produtos vendidos como upsell ou downsell no periodo selecionado</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Quantidade</th>
                <th style={{ textAlign: "right" }}>Gross</th>
                <th style={{ textAlign: "right" }}>Contribuicao %</th>
              </tr>
            </thead>
            <tbody>
              {backendProducts.map((p) => (
                <tr key={p.productName}>
                  <td style={{ fontWeight: 600 }}>{p.productName}</td>
                  <td><span className="tier-badge">{p.classification}</span></td>
                  <td className="num">{formatInt(p.quantitySold)}</td>
                  <td className="num green">{formatEur(p.gross)}</td>
                  <td className="num">{formatPct(p.contributionPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>

      <AffiliateDrawer
        affiliate={drawerAffiliate}
        rankingInfo={drawerRanking}
        filteredRows={filteredRows}
        onClose={() => setDrawerAffiliate(null)}
      />
    </>
  );
};

export default Dashboard;
