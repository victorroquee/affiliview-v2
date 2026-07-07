import React, { useMemo } from "react";
import OperationalCosts from "../components/OperationalCosts";
import EmptyState from "../components/EmptyState";
import { computeFromFiltered, type TransactionRow, type PeriodMetrics } from "../lib/transactions";

interface Props {
  filteredRows: TransactionRow[];
  periodDays: number | undefined;
  loading: boolean;
}

const CustosOperacionais: React.FC<Props> = ({ filteredRows, periodDays, loading }) => {
  const metrics = useMemo<PeriodMetrics | null>(
    () => (filteredRows.length ? computeFromFiltered(filteredRows, periodDays) : null),
    [filteredRows, periodDays]
  );

  if (!metrics) return <EmptyState loading={loading} />;
  return <OperationalCosts metrics={metrics} />;
};

export default CustosOperacionais;
