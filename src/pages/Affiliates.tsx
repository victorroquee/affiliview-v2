import React, { useMemo } from "react";
import {
  type TransactionRow,
  type AffiliateRow,
  computeFromFiltered,
  formatEur,
  formatPct,
  formatInt,
} from "../lib/csvParser";
import { Users } from "lucide-react";

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
    return m.topAffiliates;
  }, [filteredRows, periodDays]);

  if (affiliates.length === 0) {
    return (
      <div className="empty-state">
        <Users />
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

      {/* Legenda das métricas */}
      <div className="metrics-legend">
        <span><strong>Gross</strong> — Receita bruta gerada pelo afiliado</span>
        <span><strong>Earnings</strong> — Após comissão do afiliado, reserva, taxes e VAT</span>
        <span><strong>Valor Líquido</strong> — Earnings menos custo estimado de produto e frete (COGS)</span>
        <span><strong>Margem %</strong> — Valor Líquido ÷ Gross</span>
        <span><strong>Refund+CB %</strong> — % do Gross devolvido por reembolsos e chargebacks</span>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Ranking de Afiliados</h3>
          <p>Ordenado por Gross Revenue decrescente · {affiliates.length} afiliados no período selecionado</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Afiliado</th>
              <th style={{ textAlign: "right" }}>Gross</th>
              <th style={{ textAlign: "right" }}>Earnings</th>
              <th style={{ textAlign: "right" }}>Valor Líquido</th>
              <th style={{ textAlign: "right" }}>Vendas</th>
              <th style={{ textAlign: "right" }}>Ticket Médio</th>
              <th style={{ textAlign: "right" }}>CPA Médio</th>
              <th style={{ textAlign: "right" }}>Margem %</th>
              <th style={{ textAlign: "right" }}>Refund+CB %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a, i) => {
              const margemColor =
                a.margem > 30 ? "green" : a.margem > 15 ? "" : "orange";
              return (
                <tr key={a.name}>
                  <td style={{ color: "var(--text-3)", fontWeight: 500 }}>{i + 1}</td>
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
