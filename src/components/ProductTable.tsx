import React from "react";
import { formatEur, formatPct, formatInt, type ProductSummaryRow, type BundleRow } from "../lib/transactions";

// ─── Product Summary Table ────────────────────────
interface ProductSummaryTableProps {
  data: ProductSummaryRow[];
}

export const ProductSummaryTable: React.FC<ProductSummaryTableProps> = ({ data }) => {
  return (
    <div className="table-container">
      <div className="table-header">
        <h3>Resumo por Produto (Front)</h3>
        <p>Métricas agregadas por produto principal — excluindo upsells</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th style={{ textAlign: "right" }}>Gross Revenue</th>
            <th style={{ textAlign: "right" }}>Net Revenue</th>
            <th style={{ textAlign: "right" }}>Earnings</th>
            <th style={{ textAlign: "right" }}>Ticket Médio</th>
            <th style={{ textAlign: "right" }}>Vendas Front</th>
            <th style={{ textAlign: "right" }}>Total Vendas</th>
            <th style={{ textAlign: "right" }}>Reembolso %</th>
            <th style={{ textAlign: "right" }}>Chargeback %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.product}>
              <td style={{ fontWeight: 600 }}>{row.product}</td>
              <td className="num green">{formatEur(row.grossRevenue)}</td>
              <td className="num">{formatEur(row.netRevenue)}</td>
              <td className="num">{formatEur(row.earnings)}</td>
              <td className="num">{formatEur(row.aov)}</td>
              <td className="num">{formatInt(row.frontSales)}</td>
              <td className="num">{formatInt(row.totalSales)}</td>
              <td className={`num ${row.returnPct > 10 ? "red" : row.returnPct > 5 ? "orange" : ""}`}>
                {formatPct(row.returnPct)}
              </td>
              <td className={`num ${row.cbPct > 2 ? "red" : row.cbPct > 1 ? "orange" : ""}`}>
                {formatPct(row.cbPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Bundle Performance Table ─────────────────────
interface BundlePerformanceTableProps {
  data: BundleRow[];
}

export const BundlePerformanceTable: React.FC<BundlePerformanceTableProps> = ({
  data,
}) => {
  return (
    <div className="table-container">
      <div className="table-header">
        <h3>Performance por Kit (Front)</h3>
        <p>Detalhe por SKU de venda principal — kits de 1, 2, 3, 6, 9 ou 12 frascos</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Kit / SKU</th>
            <th>Produto</th>
            <th style={{ textAlign: "right" }}>Vendas</th>
            <th style={{ textAlign: "right" }}>Gross</th>
            <th style={{ textAlign: "right" }}>Net Revenue</th>
            <th style={{ textAlign: "right" }}>Valor Líquido</th>
            <th style={{ textAlign: "right" }}>Reembolsos</th>
            <th style={{ textAlign: "right" }}>Chargebacks</th>
            <th style={{ textAlign: "right" }}>R+CB (total)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.bundle}>
              <td style={{ fontWeight: 600 }}>{row.bundle}</td>
              <td style={{ color: "var(--text-2)", fontSize: 12 }}>
                {row.product}
              </td>
              <td className="num">{formatInt(row.vendas)}</td>
              <td className="num green">{formatEur(row.gross)}</td>
              <td className="num">{formatEur(row.netRevenue)}</td>
              <td className={`num ${row.valorLiq < 0 ? "red" : "green"}`}>
                {formatEur(row.valorLiq)}
              </td>
              <td className={`num ${row.reembolsos > 0 ? "orange" : ""}`}>
                {formatInt(row.reembolsos)}
              </td>
              <td className={`num ${row.chargebacks > 0 ? "red" : ""}`}>
                {formatInt(row.chargebacks)}
              </td>
              <td className={`num ${row.rcb > 0 ? "red" : ""}`}>
                {formatInt(row.rcb)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Top Affiliates Table ─────────────────────────
interface AffiliateTableProps {
  data: {
    name: string;
    gross: number;
    refundCbPct: number;
    status: "Scale" | "Watch" | "Probation";
  }[];
}

export const AffiliateTable: React.FC<AffiliateTableProps> = ({ data }) => {
  return (
    <div className="scorecard-card">
      <div className="scorecard-label">Top Afiliados por Gross Revenue</div>
      {data.length > 0 ? (
        <>
          <div className="aff-table-header-row">
            <span className="aff-table-rank" />
            <span className="aff-table-name" style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase" }}>Afiliado</span>
            <span className="aff-table-gross" style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase" }}>Gross</span>
            <span style={{ width: 64, fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase", textAlign: "right" }}>Status</span>
          </div>
          {data.slice(0, 8).map((a, i) => (
            <div key={a.name} className="aff-table-row">
              <span className="aff-table-rank">#{i + 1}</span>
              <span className="aff-table-name">{a.name}</span>
              <span className="aff-table-gross">{formatEur(a.gross)}</span>
              <span className={`status-badge ${a.status.toLowerCase()}`}>
                {a.status}
              </span>
            </div>
          ))}
          <div className="aff-table-legend">
            <span className="status-badge scale">Scale</span> Meta superada &nbsp;·&nbsp;
            <span className="status-badge watch">Watch</span> Em observação &nbsp;·&nbsp;
            <span className="status-badge probation">Probation</span> Abaixo da meta
          </div>
        </>
      ) : (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>—</div>
      )}
    </div>
  );
};
