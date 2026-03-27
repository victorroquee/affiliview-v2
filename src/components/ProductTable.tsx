import React from "react";
import { formatEur, formatPct, formatInt, type ProductSummaryRow, type BundleRow } from "../lib/transactions";
import InfoTooltip from "./InfoTooltip";

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
            <th style={{ textAlign: "right" }}>Gross Revenue <InfoTooltip text="Soma de amount de todas as vendas frontais do produto. Não desconta reembolsos nem chargebacks — é a receita bruta gerada." /></th>
            <th style={{ textAlign: "right" }}>Net Revenue <InfoTooltip text="Gross Revenue menos o valor de reembolsos e chargebacks. Receita efetivamente retida após devoluções no período." /></th>
            <th style={{ textAlign: "right" }}>Earnings <InfoTooltip text="Soma de earned_amount (margem da plataforma) nas vendas frontais, já líquido de estornos negativos de reembolsos e CB." /></th>
            <th style={{ textAlign: "right" }}>Ticket Médio <InfoTooltip text="Gross frontal ÷ nº de vendas front. Valor médio por pedido inicial neste produto, excluindo upsells." /></th>
            <th style={{ textAlign: "right" }}>Vendas Front <InfoTooltip text="Contagem de pagamentos aprovados com upsell_no=0 atribuídos a este produto no período." /></th>
            <th style={{ textAlign: "right" }}>Total Vendas <InfoTooltip text="Vendas frontais + upsells atribuídos a este produto. Inclui todos os tipos de transação do produto." /></th>
            <th style={{ textAlign: "right" }}>Reembolso % <InfoTooltip text="Count-based: qtd. reembolsos ÷ vendas front. Laranja >5%, vermelho >10%. Impacta diretamente o Net Revenue." /></th>
            <th style={{ textAlign: "right" }}>Chargeback % <InfoTooltip text="Count-based: qtd. chargebacks ÷ vendas front. Laranja >1%, vermelho >2%. Chargebacks têm custo adicional de disputa." /></th>
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

export const BundlePerformanceTable: React.FC<BundlePerformanceTableProps> = ({ data }) => {
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
            <th style={{ textAlign: "right" }}>Vendas <InfoTooltip text="Número de pedidos frontais (upsell_no=0) deste kit específico no período selecionado." /></th>
            <th style={{ textAlign: "right" }}>Gross <InfoTooltip text="Receita bruta (amount) gerada por este kit. Não desconta reembolsos nem chargebacks." /></th>
            <th style={{ textAlign: "right" }}>Net Revenue <InfoTooltip text="Gross menos o valor monetário de reembolsos e chargebacks deste kit no período." /></th>
            <th style={{ textAlign: "right" }}>Valor Líquido <InfoTooltip text="Net Revenue menos o COGS (custo do produto + frete) deste kit. Verde = lucrativo, vermelho = prejuízo." /></th>
            <th style={{ textAlign: "right" }}>Reembolsos <InfoTooltip text="Quantidade absoluta de pedidos reembolsados neste kit. Laranja indica ao menos um reembolso no período." /></th>
            <th style={{ textAlign: "right" }}>Chargebacks <InfoTooltip text="Quantidade absoluta de chargebacks neste kit. Vermelho indica ao menos um chargeback no período." /></th>
            <th style={{ textAlign: "right" }}>R+CB (total) <InfoTooltip text="Total de ocorrências de reembolsos + chargebacks neste kit. Referência rápida de exposição ao risco." /></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.bundle}>
              <td style={{ fontWeight: 600 }}>{row.bundle}</td>
              <td style={{ color: "var(--text-3)", fontSize: 11 }}>{row.product}</td>
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
            <span className="aff-table-name aff-col-label">Afiliado</span>
            <span className="aff-table-gross aff-col-label">Gross</span>
            <span className="aff-col-label" style={{ width: 72, textAlign: "right" }}>Status</span>
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
