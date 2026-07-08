import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import AffiliatesPage from "./pages/Affiliates";
import CpaFixo from "./pages/CpaFixo";
import CpaVariavel from "./pages/CpaVariavel";
import Payout from "./pages/Payout";
import CustosOperacionais from "./pages/CustosOperacionais";
import Produtos from "./pages/Produtos";
import ConferenciaCPA from "./pages/ConferenciaCPA";
import ConferenciaVL from "./pages/ConferenciaVL";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PeriodBar from "./components/PeriodBar";
import HeaderClock from "./components/HeaderClock";
import RefreshStatus from "./components/RefreshStatus";
import { useDigistoreAPI } from "./hooks/useDigistoreAPI";
import { useFilters, offsetDate } from "./hooks/useFilters";
import { useAuth } from "./hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { computePayoutSchedule } from "./lib/payout";
import type { PeriodFilter } from "./hooks/useFilters";
import { INITIAL_PERIOD } from "./hooks/useFilters";
import { Loader2 } from "lucide-react";

export type Page =
  | "dashboard" | "affiliates" | "payout" | "custos" | "produtos"
  | "conf-cpa" | "conf-vl" | "cpa-fixo" | "cpa-variavel" | "settings";

const EPOCH_FROM = "2020-01-01";                 // "Tudo (desde o início)"
const SUPERSET_LABEL = "-30d";                   // janela padrão buscada (cobre Hoje/7d/30d)
const todayISO = () => new Date().toISOString().slice(0, 10);

/** Data inicial (ISO) que um período precisa que esteja carregado. */
function neededFrom(p: PeriodFilter): string {
  if (p.mode === "custom") return p.dateFrom || EPOCH_FROM;
  const t = todayISO();
  if (p.preset === "today") return t;
  if (p.preset === "last7") return offsetDate(t, -6);
  return offsetDate(t, -29); // last30
}

const App: React.FC = () => {
  const { session, loading: authLoading, signOut } = useAuth();
  const { settings } = useSettings();
  const [page, setPage] = useState<Page>("dashboard");
  const [period, setPeriod] = useState<PeriodFilter>(INITIAL_PERIOD);

  const { rows, loading, refreshing, error, lastFetched, fetch: fetchData } = useDigistoreAPI();

  // Janela atualmente buscada: label enviado à API + a data inicial resolvida (ISO) p/ comparação
  const fetchLabelRef = useRef<string>(SUPERSET_LABEL);
  const fetchFromISORef = useRef<string>(offsetDate(todayISO(), -29));
  const fetchedRef = useRef(false);

  const doFetch = useCallback((fromLabel: string) => {
    fetchLabelRef.current = fromLabel;
    fetchFromISORef.current = fromLabel === SUPERSET_LABEL ? offsetDate(todayISO(), -29) : fromLabel;
    void fetchData({ from: fromLabel, to: "now" });
  }, [fetchData]);

  // Busca o superset de 30d uma vez (após login) — Hoje/7d/30d saem daqui client-side
  useEffect(() => {
    if (!session || fetchedRef.current) return;
    fetchedRef.current = true;
    doFetch(SUPERSET_LABEL);
  }, [session, doFetch]);

  const handlePeriodChange = useCallback((newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    const nf = neededFrom(newPeriod);
    // Só refaz a busca se o período precisa de dados MAIS ANTIGOS do que já temos.
    if (nf < fetchFromISORef.current) doFetch(nf);
  }, [doFetch]);

  const handleRefresh = useCallback(() => {
    doFetch(fetchLabelRef.current);
  }, [doFetch]);

  const {
    filteredRows, activeDateFrom, activeDateTo, isDateRangeValid, periodDays,
  } = useFilters(rows, period);

  // Payout schedule usa TODAS as rows (histórico de caixa), não o filtro de período
  const payoutSchedule = useMemo(() => computePayoutSchedule(rows), [rows]);

  // ── Gate de autenticação ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="auth-splash">
        <Loader2 size={22} className="spin" strokeWidth={1.8} />
        <span>Carregando…</span>
      </div>
    );
  }
  if (!session) return <Login />;

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} onSignOut={signOut} userEmail={session.user.email ?? ""} />

      <div className="main-content">
        <div className="global-topbar">
          <PeriodBar
            period={period}
            setPeriod={handlePeriodChange}
            activeDateFrom={activeDateFrom}
            activeDateTo={activeDateTo}
            totalRows={filteredRows.length}
            isDateRangeValid={isDateRangeValid}
          />
          <div className="topbar-right">
            <HeaderClock
              nextPayoutDate={payoutSchedule.nextPayoutDate}
              nextPayoutAmount={payoutSchedule.nextPayoutAmount}
              pendingReserve={payoutSchedule.pendingReserve}
              pendingClearing={payoutSchedule.pendingClearing}
              onOpenPayout={() => setPage("payout")}
            />
            <RefreshStatus refreshing={refreshing || loading} lastFetched={lastFetched} error={error} onRefresh={handleRefresh} />
          </div>
        </div>

        <div className="page-body" key={`${settings.currency}-${settings.language}`}>
          {page === "dashboard" ? (
            <Dashboard filteredRows={filteredRows} allRows={rows} periodDays={periodDays} payoutSchedule={payoutSchedule} onNavigate={setPage} loading={loading} error={error} />
          ) : page === "affiliates" ? (
            <AffiliatesPage filteredRows={filteredRows} allRows={rows} periodDays={periodDays} loading={loading} />
          ) : page === "payout" ? (
            <Payout schedule={payoutSchedule} loading={loading} />
          ) : page === "custos" ? (
            <CustosOperacionais filteredRows={filteredRows} periodDays={periodDays} loading={loading} />
          ) : page === "produtos" ? (
            <Produtos filteredRows={filteredRows} periodDays={periodDays} loading={loading} />
          ) : page === "conf-cpa" ? (
            <ConferenciaCPA filteredRows={filteredRows} loading={loading} />
          ) : page === "conf-vl" ? (
            <ConferenciaVL filteredRows={filteredRows} loading={loading} />
          ) : page === "cpa-fixo" ? (
            <CpaFixo filteredRows={filteredRows} loading={loading} />
          ) : page === "settings" ? (
            <Settings />
          ) : (
            <CpaVariavel filteredRows={filteredRows} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
