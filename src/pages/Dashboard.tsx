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
import { useSettings } from "../hooks/useSettings";

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
  const { t } = useSettings();
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
    return <EmptyState loading={loading} title={error ? t("dash.empty.errTitle") : t("dash.empty.title")} hint={error ? t("dash.empty.errHint") : t("dash.empty.hint")} />;
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
          <FileDown size={14} strokeWidth={1.6} /> {t("dash.exportPdf")}
        </button>
      </div>

      {/* ── Herói: KPIs chave ── */}
      <div className="hero-grid">
        <HeroStat icon={CircleDollarSign} label={t("dash.grossRevenue")} value={formatEur(metrics.gross)} sub={t("dash.grossRevenue.sub", { sales: formatInt(metrics.sales), aov: formatEur(metrics.aov) })} color="green" info={t("dash.grossRevenue.info")} />
        <HeroStat icon={TrendingUp} label={t("dash.earnings")} value={formatEur(metrics.earnings)} sub={t("dash.earnings.sub")} info={t("dash.earnings.info")} />
        <HeroStat icon={Wallet} label={t("dash.netValue")} value={formatEur(metrics.valorLiq)} sub={t("dash.netValue.sub")} color="green" info={t("dash.netValue.info")} />
        <HeroStat icon={Percent} label={t("dash.margin")} value={formatPct(margem)} sub={`${formatEur(metrics.valorLiq)} / ${formatEur(metrics.gross)}`} color={getMarginColor(margem)} info={t("dash.margin.info")} />
      </div>

      {/* ── Evolução + Caixa (payout) ── */}
      <div className="dash-split">
        <div className="dash-split-main">
          <GrossEvolutionChart data={intraday ?? metrics.dailyGross} periodDays={periodDays} intraday={!!intraday} />
        </div>
        <button className="cash-panel" onClick={() => onNavigate("payout")} title={t("nav.payout")}>
          <div className="cash-panel-head"><CalendarClock size={14} strokeWidth={1.7} /> {t("dash.cash.head")} <ChevronRight size={14} strokeWidth={2} className="cash-panel-arrow" /></div>
          <div className="cash-panel-hero">
            <span className="cash-panel-label">{t("dash.cash.next")} {payoutSchedule.nextPayoutDate ? `· ${payoutSchedule.nextPayoutDate.slice(8, 10)}/${payoutSchedule.nextPayoutDate.slice(5, 7)}` : ""}</span>
            <span className="cash-panel-value">{formatEur(payoutSchedule.nextPayoutAmount)}</span>
          </div>
          <div className="cash-panel-rows">
            <div><PiggyBank size={13} strokeWidth={1.7} /><span>{t("dash.cash.reserve")}</span><b>{formatEur(payoutSchedule.pendingReserve)}</b></div>
            <div><Hourglass size={13} strokeWidth={1.7} /><span>{t("dash.cash.clearing")}</span><b>{formatEur(payoutSchedule.pendingClearing)}</b></div>
          </div>
        </button>
      </div>

      {/* ── Atividade ── */}
      <div className="kpi-group">
        <div className="kpi-group-label">{t("dash.group.activity")}</div>
        <div className="kpi-grid-6">
          <KPICard icon={ShoppingCart} label={t("dash.sales")} value={formatInt(metrics.sales)} info={t("dash.sales.info")} />
          <KPICard icon={RotateCcw} label={t("dash.refundCb")} value={formatPct(metrics.refundCbPct)} color={getRefundColor(metrics.refundCbPct)} info={t("dash.refundCb.info", { refund: formatPct(metrics.refundPct), cb: formatPct(metrics.chargebackPct) })} />
          <KPICard icon={Zap} label={t("dash.activated")} value={formatInt(metrics.activated)} info={t("dash.activated.info")} />
          <KPICard icon={Award} label={t("dash.qualified")} value={formatInt(metrics.novosQualificados)} info={t("dash.qualified.info")} />
          <KPICard icon={Users} label={t("dash.activeAff")} value={formatInt(activosCount)} info={t("dash.activeAff.info", { active: activosCount, ramp: emRampaCount, inactive: inativoCount })} />
          <KPICard icon={UserX} label={t("dash.inactive")} value={formatInt(inativoCount)} info={t("dash.inactive.info")} />
        </div>
      </div>

      {/* ── Atalhos para detalhes (nada some — vai para abas) ── */}
      <div className="dash-quicklinks">
        <button onClick={() => onNavigate("custos")}><Boxes size={15} strokeWidth={1.6} /><div><b>{t("dash.quick.custos")}</b><span>{t("dash.quick.custos.sub", { cogs: formatEur(metrics.productCost), shipping: formatEur(metrics.shippingCost), bottles: formatInt(metrics.bottlesSold) })}</span></div><ChevronRight size={16} strokeWidth={1.8} /></button>
        <button onClick={() => onNavigate("produtos")}><Package size={15} strokeWidth={1.6} /><div><b>{t("dash.quick.produtos")}</b><span>{t("dash.quick.produtos.sub")}</span></div><ChevronRight size={16} strokeWidth={1.8} /></button>
        <button onClick={() => onNavigate("conf-vl")}><Wallet size={15} strokeWidth={1.6} /><div><b>{t("dash.quick.conf")}</b><span>{t("dash.quick.conf.sub")}</span></div><ChevronRight size={16} strokeWidth={1.8} /></button>
      </div>

      {/* ── Top Afiliados ── */}
      <div className="section-header"><h2>{t("dash.topAffiliates")}</h2></div>
      <AffiliateTable data={affiliatesWithoutMail} rankings={rankings} onSelectAffiliate={setDrawerAffiliate} />

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>

      <AffiliateDrawer affiliate={drawerAffiliate} rankingInfo={drawerRanking} filteredRows={filteredRows} onClose={() => setDrawerAffiliate(null)} />
    </>
  );
};

export default Dashboard;
