import React, { useMemo } from "react";
import {
  type TransactionRow,
  type AffiliateRow,
  computeFromFiltered,
  formatEur,
  formatPct,
  formatInt,
} from "../lib/transactions";
import { Users } from "lucide-react";
import InfoTooltip from "../components/InfoTooltip";

function isMaileonardo(affiliate: string): boolean {
  return affiliate.toLowerCase().includes("maileonardo");
}

interface AffiliatesPageProps {
  filteredRows: TransactionRow[];
  periodDays:   number | undefined;
  loading:      boolean;
}

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({
  filteredRows,
  periodDays,
  loading,
}) => {
  const affiliates: AffiliateRow[] = useMemo(() => {
    if (filteredRows.length === 0) return [];
    const m = computeFromFiltered(filteredRows, periodDays);
    return m.topAffiliates.filter((a) => !isMaileonardo(a.name));
  }, [filteredRows, periodDays]);

  if (affiliates.length === 0) {
    return (
      <div className="empty-state">
        <Users size={36} strokeWidth={1.4} />
        <h3>Sem dados de afiliados</h3>
        <p>
          {loading
            ? "Buscando transações da API Digistore24..."
            : "Aguarde o carregamento dos dados ou ajuste o período de busca."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="section-header">
        <h2>Resultados por Afiliado</h2>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Ranking de Afiliados</h3>
          <p>Ordenado por Gross Revenue decrescente · {affiliates.length} afiliados no período selecionado · Maileonardo contabilizado em Mail Vendas</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Afiliado</th>
              <th style={{ textAlign: "right" }}>Gross <InfoTooltip text="Soma de amount de todos os pagamentos atribuídos ao afiliado (front + upsell). Não deduz reembolsos nem chargebacks — representa a receita bruta gerada pelo afiliado." /></th>
              <th style={{ textAlign: "right" }}>Earnings <InfoTooltip text="Soma de earned_amount incluindo estornos negativos de reembolsos e chargebacks. Representa o valor líquido de comissões e receita após devoluções." /></th>
              <th style={{ textAlign: "right" }}>Valor Líquido <InfoTooltip text="Earnings do afiliado menos o COGS (custo do produto + frete) por transação. Representa o lucro operacional direto após custos variáveis." /></th>
              <th style={{ textAlign: "right" }}>Vendas <InfoTooltip text="Contagem de pagamentos frontais (upsell_no=0) atribuídos ao afiliado no período. Upsells e bump orders não são contados." /></th>
              <th style={{ textAlign: "right" }}>Ticket Médio <InfoTooltip text="Gross frontal ÷ nº de vendas front do afiliado. Indica o valor médio por pedido inicial gerado por este afiliado." /></th>
              <th style={{ textAlign: "right" }}>CPA Médio <InfoTooltip text="SUM(affiliate_amount) ÷ vendas front. Se affiliate_amount indisponível, usa gross−earnings como proxy do custo de aquisição." /></th>
              <th style={{ textAlign: "right" }}>Margem % <InfoTooltip text="Valor Líquido ÷ Gross × 100. Verde >30%, laranja 15–30%, vermelho ≤15%. Indica a eficiência do afiliado em gerar lucro líquido." /></th>
              <th style={{ textAlign: "right" }}>Refund+CB % <InfoTooltip text="Value-based por afiliado: (valor reembolsos + valor chargebacks) ÷ gross bruto. Diferente da métrica count-based exibida no dashboard geral." /></th>
              <th>Status <InfoTooltip text="Scale: afiliado acima da meta — candidato a aumento de CPA. Watch: desempenho instável — monitorar. Probation: abaixo do mínimo — risco de desativação." /></th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a, i) => {
              const margemColor =
                a.margem > 30 ? "green" : a.margem > 15 ? "orange" : "red";
              return (
                <tr key={a.name}>
                  <td style={{ color: "var(--text-3)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td className="num green">{formatEur(a.gross)}</td>
                  <td className="num">{formatEur(a.earnings)}</td>
                  <td className={`num ${a.valorLiq < 0 ? "red" : "green"}`}>
                    {formatEur(a.valorLiq)}
                  </td>
                  <td className="num">{formatInt(a.sales)}</td>
                  <td className="num">{formatEur(a.aov)}</td>
                  <td className="num">{formatEur(a.cpa)}</td>
                  <td className={`num ${margemColor}`}>{formatPct(a.margem)}</td>
                  <td className={`num ${a.refundCbPct > 10 ? "red" : a.refundCbPct > 5 ? "orange" : ""}`}>
                    {formatPct(a.refundCbPct)}
                  </td>
                  <td>
                    <span className={`status-badge ${a.status.toLowerCase()}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda de status */}
      <div className="status-legend">
        <span className="status-legend-item">
          <span className="status-badge scale">Scale</span>
          Afiliado superando a meta — candidato a aumento de CPA
        </span>
        <span className="status-legend-item">
          <span className="status-badge watch">Watch</span>
          Dentro da meta, mas com indicadores a monitorar
        </span>
        <span className="status-legend-item">
          <span className="status-badge probation">Probation</span>
          Abaixo da meta ou com alto Refund+CB — requer atenção
        </span>
      </div>

      <div className="footer">AFFILIVIEW by OG GROUP · 2026</div>
    </>
  );
};

export default AffiliatesPage;
