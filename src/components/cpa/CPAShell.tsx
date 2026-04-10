import React from "react";
import { Search, Calculator, Lock } from "lucide-react";
import type { AffiliateResult, VariantResult } from "../../lib/cpa/types";

type FilterStatus = "all" | VariantResult["cpaStatus"];

interface CPAShellProps {
  marginTarget:    number;
  setMarginTarget: (v: number) => void;
  results:         AffiliateResult[] | null;
  search:          string;
  setSearch:       (v: string) => void;
  filterStatus:    FilterStatus;
  setFilterStatus: (v: FilterStatus) => void;
  displayResults:  AffiliateResult[];
  children:        React.ReactNode;
}

const CPAShell: React.FC<CPAShellProps> = ({
  marginTarget,
  setMarginTarget,
  results,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  displayResults,
  children,
}) => {
  const counts = React.useMemo(() => {
    if (!results) return { increase: 0, ok: 0, reduce: 0 };
    return results.reduce(
      (acc, aff) => {
        const domV = aff.variants.find(v => v.variant === aff.domVariant);
        if (domV) acc[domV.cpaStatus]++;
        return acc;
      },
      { increase: 0, ok: 0, reduce: 0 } as Record<VariantResult["cpaStatus"], number>
    );
  }, [results]);

  return (
    <>
      {/* Header */}
      <div className="cpa-shell-header">
        <div className="cpa-shell-title">
          <Calculator size={20} strokeWidth={1.4} />
          <div>
            <div className="cpa-shell-label">Gestão de Afiliados</div>
            <h1 className="cpa-shell-h1">Calculadora de CPA</h1>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="cpa-controls">
        <div className="cpa-margin-group">
          <label className="cpa-margin-label">
            Margem mínima: <strong>{marginTarget}%</strong>
          </label>
          <input
            type="range"
            min={10}
            max={50}
            step={1}
            value={marginTarget}
            onChange={e => setMarginTarget(Number(e.target.value))}
            className="cpa-margin-slider"
          />
          <div className="cpa-margin-bounds">
            <span>10%</span>
            <span>50%</span>
          </div>
        </div>

        {results && (
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
        )}

        <div className="cpa-locked-feature" title="Funcionalidade em desenvolvimento">
          <Lock size={13} strokeWidth={2} />
          <span>Por Parte</span>
        </div>

        {results && (
          <div className="cpa-filter-group">
            {(
              [
                { key: "all",      label: "Todos",       count: results.length },
                { key: "increase", label: "↑ Aumentar",  count: counts.increase },
                { key: "ok",       label: "✓ OK",         count: counts.ok },
                { key: "reduce",   label: "↓ Reduzir",   count: counts.reduce },
              ] as { key: FilterStatus; label: string; count: number }[]
            ).map(({ key, label, count }) => (
              <button
                key={key}
                className={`cpa-filter-btn ${filterStatus === key ? "active" : ""} ${key !== "all" ? `cpa-filter-${key}` : ""}`}
                onClick={() => setFilterStatus(key)}
              >
                {label} <span className="cpa-filter-count">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {results && (
        <div className="cpa-results-info">
          {displayResults.length} afiliado{displayResults.length !== 1 ? "s" : ""}
          {filterStatus !== "all" || search ? " (filtrado)" : ""}
        </div>
      )}

      {children}

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>
    </>
  );
};

export default CPAShell;
