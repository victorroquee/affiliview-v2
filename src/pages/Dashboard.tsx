import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import KPICard from "../components/KPICard";
import { GrossEvolutionChart, ProductMixChart, RefundByProductChart, PRODUCT_COLORS } from "../components/Charts";
import { ProductSummaryTable, BundlePerformanceTable, AffiliateTable } from "../components/ProductTable";
import {
  type TransactionRow,
  type PeriodMetrics,
  computeFromFiltered,
  formatEur,
  formatPct,
  formatInt,
} from "../lib/transactions";

// ─── Maileonardo identifier ───────────────────────────────────────────────────
function isMaileonardo(affiliate: string): boolean {
  return affiliate.toLowerCase().includes("maileonardo");
}

interface DashboardProps {
  filteredRows: TransactionRow[];
  periodDays:   number | undefined;
  loading:      boolean;
  error:        string | null;
}

const Dashboard: React.FC<DashboardProps> = ({
  filteredRows,
  periodDays,
  loading,
  error,
}) => {
  const [productFilter, setProductFilter] = useState<string>("all");

  const metrics: PeriodMetrics | null = useMemo(() => {
    if (filteredRows.length === 0) return null;
    return computeFromFiltered(filteredRows, periodDays);
  }, [filteredRows, periodDays]);

  // Exclude Maileonardo from regular affiliate table
  const affiliatesWithoutMail = useMemo(() => {
    if (!metrics) return [];
    return metrics.topAffiliates.filter((a) => !isMaileonardo(a.name));
  }, [metrics]);

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
        <BarChart2 size={36} strokeWidth={1.4} />
        <h3>Nenhum dado carregado</h3>
        <p>
          {error
            ? "Verifique a conexão com a API Digistore24 e tente novamente."
            : loading
            ? "Buscando transações..."
            : `Clique em "Conectar" para carregar os dados da sua conta Digistore24.`}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── Bloco: Receita ── */}
          <div className="kpi-group">
            <div className="kpi-group-label">Receita</div>
            <div className="kpi-grid">
              <KPICard
                icon={CircleDollarSign}
                label="Gross Revenue"
                value={formatEur(metrics.gross)}
                info="Receita bruta dos pagamentos aprovados menos o valor bruto de reembolsos e chargebacks. Alinhado com o 'Gross' do dashboard interno da Digistore."
                color="green"
              />
              <KPICard
                icon={TrendingUp}
                label="Earnings"
                value={formatEur(metrics.earnings)}
                info="Soma de earned_amount de todas as transações, incluindo estornos negativos de reembolsos e chargebacks. Representa a receita líquida da plataforma após devoluções."
              />
              <KPICard
                icon={Wallet}
                label="Valor Líquido"
                value={formatEur(metrics.valorLiq)}
                info="Earnings menos o custo de produtos (COGS): preço do produto + frete por transação. Representa o lucro operacional direto após custos variáveis."
                color="green"
              />
              <KPICard
                icon={ShoppingCart}
                label="Ticket Médio (AOV)"
                value={formatEur(metrics.aov)}
                info="Gross das vendas frontais (upsell_no=0) dividido pelo número de pedidos front. Mede o valor médio por pedido inicial, excluindo upsells e bump orders."
              />
              <KPICard
                icon={RotateCcw}
                label="Reembolso + Chargeback"
                value={formatPct(metrics.refundCbPct)}
                info={`Taxa value-based: (gross reembolsos + gross chargebacks) ÷ gross revenue total. Alerta: laranja >5%, vermelho >10%. Reembolso: ${formatPct(metrics.refundPct)} · Chargeback: ${formatPct(metrics.chargebackPct)}`}
                color={metrics.refundCbPct > 10 ? "red" : metrics.refundCbPct > 5 ? "orange" : ""}
              />
            </div>
          </div>

          {/* ── Bloco: Atividade ── */}
          <div className="kpi-group">
            <div className="kpi-group-label">Atividade</div>
            <div className="kpi-grid-4">
              <KPICard icon={ShoppingCart} label="Vendas Totais"     value={formatInt(metrics.sales)}                     info="Contagem de pagamentos aprovados com upsell_no=0 (pedidos principais/frontais). Upsells e bump orders não são contados aqui." />
              <KPICard icon={Zap}          label="Ativados ≥ €2K"    value={formatInt(metrics.activated)}                 info="Afiliados cujo affiliate_amount acumulado no período é ≥ €2.000. Indica afiliados operando em escala ativa com alto volume de comissões." />
              <KPICard icon={Award}        label="Novos Qualificados" value={formatInt(metrics.novosQualificados)}          info="Afiliados com média diária de gross ≥ €1.000/dia no período. São candidatos a promoção de CPA ou condições especiais de parceria." />
              <KPICard icon={Users}        label="Afiliados Ativos"  value={formatInt(metrics.affiliatesSelling.filter((n) => !isMaileonardo(n)).length)}  info="Número de afiliados distintos com ao menos um pagamento registrado no período selecionado. Maileonardo é contabilizado separadamente." />
            </div>
          </div>

          {/* ── Top Afiliados & Reembolsos ── */}
          <div className="section-header">
            <h2>Top Afiliados &amp; Reembolsos por Produto</h2>
          </div>

          <div className="scorecard-row">
            <AffiliateTable data={affiliatesWithoutMail} />
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
      <BundlePerformanceTable data={filteredBundles} />

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>
    </>
  );
};

export default Dashboard;
