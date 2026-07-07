import React, { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { ProductMixChart, RefundByProductChart, PRODUCT_COLORS } from "../components/Charts";
import { ProductSummaryTable, BundlePerformanceTable } from "../components/ProductTable";
import {
  computeFromFiltered, computeBackendProducts,
  formatEur, formatPct, formatInt,
  type TransactionRow, type PeriodMetrics, type UpsellProductRow,
} from "../lib/transactions";

interface Props {
  filteredRows: TransactionRow[];
  periodDays: number | undefined;
  loading: boolean;
}

const Produtos: React.FC<Props> = ({ filteredRows, periodDays, loading }) => {
  const [productFilter, setProductFilter] = useState<string>("all");

  const metrics = useMemo<PeriodMetrics | null>(
    () => (filteredRows.length ? computeFromFiltered(filteredRows, periodDays) : null),
    [filteredRows, periodDays]
  );
  const backendProducts = useMemo<UpsellProductRow[]>(
    () => (filteredRows.length ? computeBackendProducts(filteredRows) : []),
    [filteredRows]
  );

  const products = useMemo(() => (metrics ? metrics.productSummary.map((p) => p.product) : []), [metrics]);
  const filteredSummary = useMemo(
    () => (!metrics ? [] : productFilter === "all" ? metrics.productSummary : metrics.productSummary.filter((p) => p.product === productFilter)),
    [metrics, productFilter]
  );
  const filteredBundles = useMemo(
    () => (!metrics ? [] : productFilter === "all" ? metrics.bundlePerformance : metrics.bundlePerformance.filter((b) => b.product === productFilter)),
    [metrics, productFilter]
  );

  if (!metrics) return <EmptyState loading={loading} />;

  return (
    <>
      <div className="section-header"><h2>Produtos — Performance &amp; Mix</h2></div>

      <div className="charts-row">
        <ProductMixChart data={metrics.productMix} />
        <div className="scorecard-card"><RefundByProductChart data={metrics.refundByProduct} /></div>
      </div>

      <div className="product-tabs">
        <span>Filtrar por produto:</span>
        <button className={`product-tab ${productFilter === "all" ? "active" : ""}`} onClick={() => setProductFilter("all")}>Todos</button>
        {products.map((p) => (
          <button key={p} className={`product-tab ${productFilter === p ? "active" : ""}`} onClick={() => setProductFilter(p)}>
            {PRODUCT_COLORS[p] && (
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: PRODUCT_COLORS[p], marginRight: 6, flexShrink: 0, verticalAlign: "middle" }} />
            )}
            {p}
          </button>
        ))}
      </div>

      <ProductSummaryTable data={filteredSummary} />
      <BundlePerformanceTable data={filteredBundles} upsellUnattributed={productFilter === "all" ? metrics.bundleUpsellUnattributed : undefined} />

      {backendProducts.length > 0 && (
        <div className="table-container">
          <div className="table-header">
            <h3>Resultados de Backend (Upsells/Downsells)</h3>
            <p>Produtos vendidos como upsell ou downsell no período selecionado</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th><th>Tipo</th>
                <th style={{ textAlign: "right" }}>Quantidade</th>
                <th style={{ textAlign: "right" }}>Gross</th>
                <th style={{ textAlign: "right" }}>Contribuição %</th>
              </tr>
            </thead>
            <tbody>
              {backendProducts.map((p) => (
                <tr key={p.productName}>
                  <td style={{ fontWeight: 600 }}>{p.productName}</td>
                  <td><span className="tier-badge">{p.classification}</span></td>
                  <td className="num">{formatInt(p.quantitySold)}</td>
                  <td className="num green">{formatEur(p.gross)}</td>
                  <td className="num">{formatPct(p.contributionPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default Produtos;
