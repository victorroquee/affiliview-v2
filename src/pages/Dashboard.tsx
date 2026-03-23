import React, { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ShoppingCart,
  RotateCcw,
  Zap,
  Award,
  Users,
  BarChart3,
} from "lucide-react";
import KPICard from "../components/KPICard";
import { GrossEvolutionChart, ProductMixChart, RefundByProductChart } from "../components/Charts";
import { ProductSummaryTable, BundlePerformanceTable, AffiliateTable } from "../components/ProductTable";
import {
  type TransactionRow,
  type PeriodMetrics,
  computeFromFiltered,
  formatEur,
  formatPct,
  formatInt,
} from "../lib/csvParser";

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
        <BarChart3 />
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
            icon={DollarSign}
            label="Gross Revenue"
            value={formatEur(metrics.gross)}
            sub="Receita bruta total gerada no período"
            color="green"
          />
          <KPICard
            icon={TrendingUp}
            label="Earnings"
            value={formatEur(metrics.earnings)}
            sub="Gross após comissão de afil., reserva, taxes e VAT"
          />
          <KPICard
            icon={Wallet}
            label="Valor Líquido"
            value={formatEur(metrics.valorLiq)}
            sub="Earnings − custo de produtos e frete (COGS)"
            color="green"
          />
          <KPICard
            icon={ShoppingCart}
            label="Ticket Médio (AOV)"
            value={formatEur(metrics.aov)}
            sub="Gross ÷ nº de vendas front do período"
          />
          <KPICard
            icon={RotateCcw}
            label="Reembolso + Chargeback"
            value={formatPct(metrics.refundCbPct)}
            sub={`Reembolso: ${formatPct(metrics.refundPct)} · Chargeback: ${formatPct(metrics.chargebackPct)}`}
            color={metrics.refundCbPct > 10 ? "red" : metrics.refundCbPct > 5 ? "orange" : ""}
          />
        </div>
      </div>

      {/* ── Bloco: Atividade ── */}
      <div className="kpi-group">
        <div className="kpi-group-label">Atividade</div>
        <div className="kpi-grid-4">
          <KPICard icon={ShoppingCart} label="Vendas Totais"     value={formatInt(metrics.sales)}                     sub="Pedidos front (entradas) no período" />
          <KPICard icon={Zap}          label="Ativados ≥ €2K"    value={formatInt(metrics.activated)}                 sub="Afiliados com CPA recebido ou Gross ≥ €2.000" />
          <KPICard icon={Award}        label="Novos Qualificados" value={formatInt(metrics.novosQualificados)}          sub="Afiliados com média ≥ €1.000/dia no período" />
          <KPICard icon={Users}        label="Afiliados Ativos"  value={formatInt(metrics.affiliatesSelling.length)}  sub="Com ao menos 1 venda no período" />
        </div>
      </div>

      {/* ── Top Afiliados & Reembolsos ── */}
      <div className="section-header">
        <h2>Top Afiliados &amp; Reembolsos por Produto</h2>
      </div>

      <div className="scorecard-row">
        <AffiliateTable data={metrics.topAffiliates} />
        <div className="scorecard-card">
          <RefundByProductChart data={metrics.refundByProduct} />
        </div>
      </div>

      {/* ── Evolução & Mix de Receita ── */}
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
