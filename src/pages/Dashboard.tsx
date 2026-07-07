import React, { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign, TrendingUp, Wallet, Percent, ShoppingCart, RotateCcw,
  Zap, Award, Users, UserX, FileDown, CalendarClock, PiggyBank, Hourglass,
  Boxes, Package, ChevronRight,
} from "lucide-react";
import KPICard from "../components/KPICard";
import HeroStat from "../components/HeroStat";
import EmptyState from "../components/EmptyState";
import { GrossEvolutionChart } from "../components/Charts";
import { AffiliateTable } from "../components/ProductTable";
import {
  type TransactionRow, type AffiliateRow, type AffiliateRankingInfo, type PeriodMetrics,
  computeFromFiltered, computeAffiliateRankings, computeIntradayGross, isMaileonardo, formatEur, formatPct, formatInt,
} from "../lib/transactions";
import type { PayoutSchedule } from "../lib/payout";
import type { Page } from "../App";
import AffiliateDrawer from "../components/AffiliateDrawer";
import { generateKPIReport } from "../lib/pdfExport";
import { getRefundColor, getMarginColor } from "../utils/colorThresholds";

interface DashboardProps {
  filteredRows: TransactionRow[];
  allRows: TransactionRow[];
  periodDays: number | undefined;
  payoutSchedule: PayoutSchedule;
  onNavigate: (page: Page) => void;
  loading: boolean;
  error: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({
  filteredRows, allRows, periodDays, payoutSchedule, onNavigate, loading, error,
}) => {
  const [drawerAffiliate, setDrawerAffiliate] = useState<AffiliateRow | null>(null);

  useEffect(() => { setDrawerAffiliate(null); }, [periodDays]);

  const metrics = useMemo<PeriodMetrics | null>(
    () => (filteredRows.length === 0 ? null : computeFromFiltered(filteredRows, periodDays)),
    [filteredRows, periodDays]
  );

  const affiliatesWithoutMail = useMemo(
    () => (metrics ? metrics.topAffiliates.filter((a) => !isMaileonardo(a.name)) : []),
    [metrics]
  );
  const rankings = useMemo(
    () => computeAffiliateRankings(allRows.filter((r) => !isMaileonardo(r.affiliate))),
    [allRows]
  );
  const activosCount = useMemo(() => [...rankings.values()].filter((r) => ["Tier 1", "Tier 2", "Tier 3", "Ativo"].includes(r.ranking)).length, [rankings]);
  const emRampaCount = useMemo(() => [...rankings.values()].filter((r) => r.ranking === "Em Rampa").length, [rankings]);
  const inativoCount = useMemo(() => [...rankings.values()].filter((r) => r.ranking === "Inativo").length, [rankings]);

  const drawerRanking: AffiliateRankingInfo | null = drawerAffiliate ? (rankings.get(drawerAffiliate.name) ?? null) : null;

  // Período de 1 dia → timeline intradiária (gross por hora, 00h → agora), usando o
  // timestamp (created_at). Evita o gráfico com um ponto só no modo "Hoje".
  const intraday = useMemo(
    () => (periodDays === 1 ? computeIntradayGross(filteredRows, new Date()) : null),
    [filteredRows, periodDays]
  );

  if (!metrics) {
    return <EmptyState loading={loading} title={error ? "Falha ao carregar" : "Nenhum dado no período"} hint={error ? "Verifique a conexão com a API Digistore24." : "Selecione um período com transações (Hoje, 7d, 30d) ou amplie a janela."} />;
  }

  const margem = metrics.gross > 0 ? (metrics.valorLiq / metrics.gross) * 100 : 0;

  const handleExportPDF = () => {
    const dates = filteredRows.map((r) => r.date);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    generateKPIReport({
      metrics, affiliates: affiliatesWithoutMail, rankings,
      periodLabel: `${fmt(minDate)} – ${fmt(maxDate)}${periodDays ? ` (${periodDays}d)` : ""}`,
      activosCount, emRampaCount, inativoCount,
    });
  };

  return (
    <>
      <div className="dash-actions">
        <button className="btn-export-pdf" onClick={handleExportPDF}>
          <FileDown size={14} strokeWidth={1.6} /> Exportar PDF
        </button>
      </div>

      {/* ── Herói: KPIs chave ── */}
      <div className="hero-grid">
        <HeroStat icon={CircleDollarSign} label="Gross Revenue" value={formatEur(metrics.gross)} sub={`${formatInt(metrics.sales)} vendas · AOV ${formatEur(metrics.aov)}`} color="green" info="Receita bruta de todos os pagamentos (front + upsells + bumps)." />
        <HeroStat icon={TrendingUp} label="Earnings" value={formatEur(metrics.earnings)} sub="líquido do produtor (pós-refunds)" info="Ganhos do produtor menos reembolsos/chargebacks. Alinhado com Your Earnings da Digistore24." />
        <HeroStat icon={Wallet} label="Valor Líquido" value={formatEur(metrics.valorLiq)} sub="após COGS, frete, taxas e capital" color="green" info="Earnings menos COGS + frete + taxas de fulfillment + custo de capital." />
        <HeroStat icon={Percent} label="Margem" value={formatPct(margem)} sub={`${formatEur(metrics.valorLiq)} / ${formatEur(metrics.gross)}`} color={getMarginColor(margem)} info="Valor Líquido ÷ Gross × 100." />
      </div>

      {/* ── Evolução + Caixa (payout) ── */}
      <div className="dash-split">
        <div className="dash-split-main">
          <GrossEvolutionChart data={intraday ?? metrics.dailyGross} periodDays={periodDays} intraday={!!intraday} />
        </div>
        <button className="cash-panel" onClick={() => onNavigate("payout")} title="Abrir aba Payout">
          <div className="cash-panel-head"><CalendarClock size={14} strokeWidth={1.7} /> Caixa · Payout <ChevronRight size={14} strokeWidth={2} className="cash-panel-arrow" /></div>
          <div className="cash-panel-hero">
            <span className="cash-panel-label">Próximo payout {payoutSchedule.nextPayoutDate ? `· ${payoutSchedule.nextPayoutDate.slice(8, 10)}/${payoutSchedule.nextPayoutDate.slice(5, 7)}` : ""}</span>
            <span className="cash-panel-value">{formatEur(payoutSchedule.nextPayoutAmount)}</span>
          </div>
          <div className="cash-panel-rows">
            <div><PiggyBank size={13} strokeWidth={1.7} /><span>Reserva retida</span><b>{formatEur(payoutSchedule.pendingReserve)}</b></div>
            <div><Hourglass size={13} strokeWidth={1.7} /><span>Em clearing (D+14)</span><b>{formatEur(payoutSchedule.pendingClearing)}</b></div>
          </div>
        </button>
      </div>

      {/* ── Atividade ── */}
      <div className="kpi-group">
        <div className="kpi-group-label">Atividade no período</div>
        <div className="kpi-grid-6">
          <KPICard icon={ShoppingCart} label="Vendas Totais" value={formatInt(metrics.sales)} info="Pagamentos front (upsell_no=0)." />
          <KPICard icon={RotateCcw} label="Reembolso + CB" value={formatPct(metrics.refundCbPct)} color={getRefundColor(metrics.refundCbPct)} info={`Reembolso ${formatPct(metrics.refundPct)} · Chargeback ${formatPct(metrics.chargebackPct)}`} />
          <KPICard icon={Zap} label="Ativados ≥ €2K" value={formatInt(metrics.activated)} info="Afiliados com affiliate_amount ≥ €2.000 no período." />
          <KPICard icon={Award} label="Novos Qualificados" value={formatInt(metrics.novosQualificados)} info="Afiliados com média ≥ €1.000/dia no período." />
          <KPICard icon={Users} label="Afiliados Ativos" value={formatInt(activosCount)} info={`${activosCount} Ativos · ${emRampaCount} Em Rampa · ${inativoCount} Inativos`} />
          <KPICard icon={UserX} label="Inativos" value={formatInt(inativoCount)} info="Última venda front há mais de 5 dias." />
        </div>
      </div>

      {/* ── Atalhos para detalhes (nada some — vai para abas) ── */}
      <div className="dash-quicklinks">
        <button onClick={() => onNavigate("custos")}><Boxes size={15} strokeWidth={1.6} /><div><b>Custos Operacionais</b><span>COGS {formatEur(metrics.productCost)} · frete {formatEur(metrics.shippingCost)} · {formatInt(metrics.bottlesSold)} potes</span></div><ChevronRight size={16} strokeWidth={1.8} /></button>
        <button onClick={() => onNavigate("produtos")}><Package size={15} strokeWidth={1.6} /><div><b>Produtos</b><span>mix, performance por kit e backend</span></div><ChevronRight size={16} strokeWidth={1.8} /></button>
        <button onClick={() => onNavigate("conf-vl")}><Wallet size={15} strokeWidth={1.6} /><div><b>Conferência</b><span>CPA e Valor Líquido transação a transação</span></div><ChevronRight size={16} strokeWidth={1.8} /></button>
      </div>

      {/* ── Top Afiliados ── */}
      <div className="section-header"><h2>Top Afiliados</h2></div>
      <AffiliateTable data={affiliatesWithoutMail} rankings={rankings} onSelectAffiliate={setDrawerAffiliate} />

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>

      <AffiliateDrawer affiliate={drawerAffiliate} rankingInfo={drawerRanking} filteredRows={filteredRows} onClose={() => setDrawerAffiliate(null)} />
    </>
  );
};

export default Dashboard;
