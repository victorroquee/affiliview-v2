import React from "react";
import { Calculator, Search, BarChart2, Users, TrendingUp, DollarSign, RotateCcw } from "lucide-react";
import LoadingDot from "../components/LoadingDot";
import type { TransactionRow } from "../lib/transactions";
import { formatEur } from "../lib/transactions";
import { useCpaVariavel } from "../hooks/useCpaVariavel";
import CpaVariavelTable from "../components/cpa/CpaVariavelTable";
import AffiliateDetail from "../components/cpa/AffiliateDetail";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  filteredRows: TransactionRow[];
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CpaVariavel: React.FC<Props> = ({ filteredRows, loading }) => {
  const {
    results,
    kpis,
    search,
    setSearch,
    displayResults,
    selectedAff,
    setSelected,
    marginTarget,
    setMarginTarget,
    customCpas,
    setCustomCpa,
    clearSimulation,
  } = useCpaVariavel(filteredRows);

  return (
    <div className="cpa-variavel-page">
      {/* Header */}
      <div className="cpa-shell-header">
        <div className="cpa-shell-title">
          <Calculator size={20} strokeWidth={1.4} />
          <div>
            <div className="cpa-shell-label">Gestao de Afiliados</div>
            <h1 className="cpa-shell-h1">CPA Variavel</h1>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Afiliados ativos</span>
              <Users size={16} className="kpi-card-icon" />
            </div>
            <div className="kpi-card-value">{kpis.totalAffiliates}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Margem media (LTV)</span>
              <TrendingUp size={16} className="kpi-card-icon" />
            </div>
            <div className={`kpi-card-value ${kpis.avgMargin >= 0 ? "green" : "red"}`}>
              {formatEur(kpis.avgMargin)}
            </div>
            <div className="kpi-card-sub">por pedido front (var. dominante)</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">AOV medio</span>
              <DollarSign size={16} className="kpi-card-icon" />
            </div>
            <div className="kpi-card-value">{formatEur(kpis.avgAov)}</div>
            <div className="kpi-card-sub">bruto por front order (var. dominante)</div>
          </div>
        </div>
      )}

      {/* Search bar and simulation controls */}
      {results && (
        <div className="cpa-controls">
          <div className="cpa-margin-group">
            <label className="cpa-margin-label">
              Margem alvo: <strong>{marginTarget}%</strong>
            </label>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={marginTarget}
              onChange={e => setMarginTarget(Number(e.target.value))}
              className="cpa-margin-slider"
            />
            <div className="cpa-margin-bounds">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>

          <div className="cpa-search-wrap">
            <Search size={14} strokeWidth={1.4} className="cpa-search-icon" />
            <input
              type="text"
              className="cpa-search-input"
              placeholder="Buscar afiliado..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {(marginTarget > 0 || Object.keys(customCpas).length > 0) && (
            <button
              className="cpa-reset-btn"
              onClick={clearSimulation}
              title="Limpar simulacao"
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 12px", borderRadius: 6,
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                color: "var(--text-2)", cursor: "pointer", fontSize: 12, fontWeight: 500,
              }}
            >
              <RotateCcw size={13} strokeWidth={1.6} />
              Limpar simulacao
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {results && (
        <div className="cpa-results-info">
          {displayResults.length} afiliado{displayResults.length !== 1 ? "s" : ""}
          {search ? " (filtrado)" : ""}
        </div>
      )}

      {/* Empty state — no data loaded */}
      {filteredRows.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon-row">
            <BarChart2 size={36} strokeWidth={1.4} />
            {loading && <LoadingDot />}
          </div>
          <h3>{loading ? "Buscando transacoes..." : "Nenhum dado carregado"}</h3>
          <p>
            {loading
              ? "Aguarde enquanto os dados sao carregados da API Digistore24."
              : "Os dados sao carregados automaticamente ao abrir o dashboard."}
          </p>
        </div>
      )}

      {/* Empty state — data loaded but no front orders */}
      {filteredRows.length > 0 && results !== null && results.length === 0 && (
        <div className="empty-state">
          <BarChart2 size={36} strokeWidth={1.4} />
          <h3>Sem afiliados com front orders</h3>
          <p>
            Nenhum produto M1/M2/M3 encontrado no periodo selecionado.
            Ajuste o filtro de periodo.
          </p>
        </div>
      )}

      {/* Affiliate detail view */}
      {results && selectedAff && (
        <AffiliateDetail
          aff={selectedAff}
          marginTarget={marginTarget}
          setCustomCpa={setCustomCpa}
          onBack={() => setSelected(null)}
        />
      )}

      {/* Affiliate table */}
      {results && !selectedAff && results.length > 0 && (
        <CpaVariavelTable
          results={displayResults}
          marginTarget={marginTarget}
          onSelect={(name) => {
            setSelected(name);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {/* Footer */}
      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>
    </div>
  );
};

export default CpaVariavel;
