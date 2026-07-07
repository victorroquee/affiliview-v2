import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import AffiliatesPage from "./pages/Affiliates";
import CpaFixo from "./pages/CpaFixo";
import CpaVariavel from "./pages/CpaVariavel";
import Payout from "./pages/Payout";
import Login from "./pages/Login";
import PeriodBar from "./components/PeriodBar";
import HeaderClock from "./components/HeaderClock";
import { useDigistoreAPI } from "./hooks/useDigistoreAPI";
import { useFilters } from "./hooks/useFilters";
import { useAuth } from "./hooks/useAuth";
import { periodToApiParams } from "./utils/digiNormalizer";
import { computePayoutSchedule } from "./lib/payout";
import type { PeriodFilter } from "./hooks/useFilters";
import { INITIAL_PERIOD } from "./hooks/useFilters";
import { Loader2 } from "lucide-react";

type Page = "dashboard" | "affiliates" | "cpa-fixo" | "cpa-variavel" | "payout";

const App: React.FC = () => {
  const { session, loading: authLoading, signOut } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");

  const [period, setPeriod] = useState<PeriodFilter>(INITIAL_PERIOD);

  const { rows, loading, error, fetch: fetchData } =
    useDigistoreAPI();

  const lastParamsRef = useRef({ from: "-30d", to: "now" });
  const fetchedRef = useRef(false);

  useEffect(() => {
    // só busca dados depois de autenticado
    if (!session) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchData(lastParamsRef.current);
  }, [session, fetchData]);

  const handlePeriodChange = useCallback((newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    const params = periodToApiParams(newPeriod);
    lastParamsRef.current = params;
    void fetchData(params);
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    void fetchData(lastParamsRef.current);
  }, [fetchData]);

  // Global filter — computed once, passed to all pages
  const {
    filteredRows,
    activeDateFrom,
    activeDateTo,
    isDateRangeValid,
    periodDays,
  } = useFilters(rows, period);

  // Payout schedule usa TODAS as rows (não o filtro de período) — é histórico de caixa
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
  if (!session) {
    return <Login />;
  }

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} onSignOut={signOut} userEmail={session.user.email ?? ""} />

      <div className="main-content">
        {/* ── Global sticky topbar ── */}
        <div className="global-topbar">
          <PeriodBar
            period={period}
            setPeriod={handlePeriodChange}
            activeDateFrom={activeDateFrom}
            activeDateTo={activeDateTo}
            totalRows={filteredRows.length}
            isDateRangeValid={isDateRangeValid}
          />
          <HeaderClock
            nextPayoutDate={payoutSchedule.nextPayoutDate}
            nextPayoutAmount={payoutSchedule.nextPayoutAmount}
          />
          <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
            {loading ? "…" : "↻"}
          </button>
        </div>

        {/* ── Page content ── */}
        <div className="page-body">
          {page === "dashboard" ? (
            <Dashboard
              filteredRows={filteredRows}
              allRows={rows}
              periodDays={periodDays}
              payoutSchedule={payoutSchedule}
              loading={loading}
              error={error}
            />
          ) : page === "affiliates" ? (
            <AffiliatesPage
              filteredRows={filteredRows}
              allRows={rows}
              periodDays={periodDays}
              loading={loading}
            />
          ) : page === "payout" ? (
            <Payout schedule={payoutSchedule} loading={loading} />
          ) : page === "cpa-fixo" ? (
            <CpaFixo
              filteredRows={filteredRows}
              loading={loading}
            />
          ) : (
            <CpaVariavel
              filteredRows={filteredRows}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
