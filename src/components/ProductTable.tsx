import React from "react";
import { formatEur, formatPct, formatInt, type ProductSummaryRow, type BundleRow, type AffiliateRow, type AffiliateRanking, type AffiliateRankingInfo } from "../lib/transactions";
import InfoTooltip from "./InfoTooltip";

const RANKING_CLASS: Record<AffiliateRanking, string> = {
  "Tier 1": "tier-1", "Tier 2": "tier-2", "Tier 3": "tier-3",
  "Ativo": "tier-ativo", "Em Rampa": "tier-em-rampa", "Inativo": "tier-inativo",
};

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
            <th style={{ textAlign: "right" }}>Ticket Médio <InfoTooltip text="Gross total (front + upsells + bumps) ÷ nº de vendas front. Valor médio total por pedido neste produto, incluindo upsells e bumps." /></th>
            <th style={{ textAlign: "right" }}>Vendas Front <InfoTooltip text="Contagem de pagamentos aprovados com upsell_no=0 atribuídos a este produto no período." /></th>
            <th style={{ textAlign: "right" }}>Total Vendas <InfoTooltip text="Vendas frontais + upsells atribuídos a este produto. Inclui todos os tipos de transação do produto." /></th>
            <th style={{ textAlign: "right" }}>Reembolso % <InfoTooltip text="Value-based: valor dos reembolsos ÷ gross revenue front. Laranja >5%, vermelho >10%. Impacta diretamente o Net Revenue." /></th>
            <th style={{ textAlign: "right" }}>Chargeback % <InfoTooltip text="Value-based: valor dos chargebacks ÷ gross revenue front. Laranja >1%, vermelho >2%. Chargebacks têm custo adicional de disputa." /></th>
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
            <th style={{ textAlign: "right" }}>Reembolso % <InfoTooltip text="Percentual de reembolsos sobre vendas deste kit. Laranja ≤8%, vermelho >8%." /></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.bundle}>
              <td style={{ fontWeight: 600 }}>{row.bundle.replace(/^M\d+\s*/i, "")}</td>
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
              <td className={`num ${row.refundPct > 8 ? "red" : row.refundPct > 0 ? "orange" : ""}`}>
                {formatPct(row.refundPct)}
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
  data: AffiliateRow[];
  rankings?: Map<string, AffiliateRankingInfo>;
  onSelectAffiliate?: (affiliate: AffiliateRow) => void;
}

export const AffiliateTable: React.FC<AffiliateTableProps> = ({ data, rankings, onSelectAffiliate }) => {
  return (
    <div className="scorecard-card">
      <div className="scorecard-label">Top Afiliados por Gross Revenue</div>
      {data.length > 0 ? (
        <>
          <div className="aff-table-header-row">
            <span className="aff-table-rank" />
            <span className="aff-table-name aff-col-label">Afiliado</span>
            <span className="aff-table-gross aff-col-label">Gross</span>
            <span className="aff-col-label" style={{ width: 56, textAlign: "right" }}>Tier</span>
          </div>
          {data.slice(0, 8).map((a, i) => {
            const ranking: AffiliateRanking = rankings?.get(a.name)?.ranking ?? "Inativo";
            return (
              <div
                key={a.name}
                className={`aff-table-row${onSelectAffiliate ? " clickable" : ""}`}
                onClick={() => onSelectAffiliate?.(a)}
              >
                <span className="aff-table-rank">#{i + 1}</span>
                <span className="aff-table-name">{a.name}</span>
                <span className="aff-table-gross">{formatEur(a.gross)}</span>
                <span className={`tier-badge ${RANKING_CLASS[ranking]}`} style={{ fontSize: 10 }}>
                  {ranking}
                </span>
              </div>
            );
          })}
          <div className="aff-table-legend">
            <span className="tier-badge tier-1" style={{ fontSize: 10 }}>Tier 1</span> ≥€15k &nbsp;·&nbsp;
            <span className="tier-badge tier-2" style={{ fontSize: 10 }}>Tier 2</span> ≥€5k &nbsp;·&nbsp;
            <span className="tier-badge tier-3" style={{ fontSize: 10 }}>Tier 3</span> ≥€1k &nbsp;·&nbsp;
            <span className="tier-badge tier-ativo" style={{ fontSize: 10 }}>Ativo</span> ≥10 vendas
          </div>
        </>
      ) : (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>—</div>
      )}
    </div>
  );
};
