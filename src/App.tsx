import React, { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import AffiliatesPage from "./pages/Affiliates";
import CpaCalculator from "./pages/CpaCalculator";
import CpaFixo from "./pages/CpaFixo";
import CpaVariavel from "./pages/CpaVariavel";
import PeriodBar from "./components/PeriodBar";
import { useDigistoreAPI } from "./hooks/useDigistoreAPI";
import { useFilters } from "./hooks/useFilters";
import { periodToApiParams } from "./utils/digiNormalizer";
import type { PeriodFilter } from "./hooks/useFilters";
import { INITIAL_PERIOD } from "./hooks/useFilters";

type Page = "dashboard" | "affiliates" | "calculator" | "cpa-fixo" | "cpa-variavel";

const App: React.FC = () => {
  const [page, setPage] = useState<Page>("dashboard");

  const [period, setPeriod] = useState<PeriodFilter>(INITIAL_PERIOD);

  const { rows, loading, error, lastFetched, fetch: fetchData } =
    useDigistoreAPI();

  const lastParamsRef = useRef({ from: "-30d", to: "now" });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchData(lastParamsRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} />

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
          ) : page === "cpa-fixo" ? (
            <CpaFixo
              filteredRows={filteredRows}
              loading={loading}
            />
          ) : page === "cpa-variavel" ? (
            <CpaVariavel
              filteredRows={filteredRows}
              loading={loading}
            />
          ) : (
            <CpaCalculator
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
