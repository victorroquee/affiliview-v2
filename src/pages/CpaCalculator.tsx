import React, { useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";
import type { TransactionRow } from "../lib/transactions";
import type { VariantResult } from "../lib/cpa/types";
import { useCPACalculator } from "../hooks/useCPACalculator";
import CPAShell from "../components/cpa/CPAShell";
import CPATable from "../components/cpa/CPATable";
import AffiliateDetail from "../components/cpa/AffiliateDetail";

type FilterStatus = "all" | VariantResult["cpaStatus"];

interface CpaCalculatorProps {
  filteredRows: TransactionRow[];
  loading:      boolean;
}

const CpaCalculator: React.FC<CpaCalculatorProps> = ({
  filteredRows,
  loading,
}) => {
  const [selected,     setSelected]     = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const { results, marginTarget, setMarginTarget } = useCPACalculator(filteredRows);

  const displayResults = useMemo(() => {
    if (!results) return [];
    return results
      .filter((aff) =>
        !search || aff.name.toLowerCase().includes(search.toLowerCase())
      )
      .filter((aff) => {
        if (filterStatus === "all") return true;
        const domV = aff.variants.find((v) => v.variant === aff.domVariant);
        return domV?.cpaStatus === filterStatus;
      });
  }, [results, search, filterStatus]);

  const selectedAff = displayResults.find((a) => a.name === selected) ?? null;

  React.useEffect(() => {
    if (selected && !selectedAff) setSelected(null);
  }, [selected, selectedAff]);

  return (
    <CPAShell
      marginTarget={marginTarget}
      setMarginTarget={setMarginTarget}
      results={results}
      search={search}
      setSearch={setSearch}
      filterStatus={filterStatus}
      setFilterStatus={setFilterStatus}
      displayResults={displayResults}
    >
      {filteredRows.length === 0 && (
        <div className="empty-state">
          <BarChart2 size={36} strokeWidth={1.4} />
          <h3>{loading ? "Buscando transações..." : "Nenhum dado carregado"}</h3>
          <p>
            {loading
              ? "Aguarde enquanto os dados são carregados da API Digistore24."
              : "Os dados são carregados automaticamente ao abrir o dashboard."}
          </p>
        </div>
      )}

      {filteredRows.length > 0 && results !== null && results.length === 0 && (
        <div className="empty-state">
          <BarChart2 size={36} strokeWidth={1.4} />
          <h3>Sem afiliados com front orders</h3>
          <p>
            Nenhum produto M1/M2/M3 encontrado no período selecionado.
            Ajuste o filtro de período.
          </p>
        </div>
      )}

      {results && selectedAff && (
        <AffiliateDetail
          aff={selectedAff}
          marginTarget={marginTarget}
          onBack={() => setSelected(null)}
        />
      )}

      {results && !selectedAff && results.length > 0 && (
        <CPATable
          results={displayResults}
          onSelect={(name) => {
            setSelected(name);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </CPAShell>
  );
};

export default CpaCalculator;
