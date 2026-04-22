import React from "react";
import { Calculator } from "lucide-react";
import LoadingDot from "../components/LoadingDot";
import type { TransactionRow } from "../lib/transactions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  filteredRows: TransactionRow[];
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CpaVariavel: React.FC<Props> = ({ loading }) => {
  if (loading) return <LoadingDot />;

  return (
    <div className="cpa-variavel-page">
      <h2>
        <Calculator size={18} strokeWidth={1.4} />
        CPA Variavel
      </h2>
      <p>Pagina em construcao — dados e simulacao virao nas proximas fases.</p>
    </div>
  );
};

export default CpaVariavel;
