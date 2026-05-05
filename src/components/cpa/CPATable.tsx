import React from "react";
import type { AffiliateResult } from "../../lib/cpa/types";
import { formatEur as fmtEur, formatPct as fmtPct, formatInt as fmtInt } from "../../lib/transactions";
import StatusBadge from "./StatusBadge";
import InfoTooltip from "../InfoTooltip";
import { getRefundColor } from "../../utils/colorThresholds";

interface CPATableProps {
  results:  AffiliateResult[];
  onSelect: (name: string) => void;
}

const CPATable: React.FC<CPATableProps> = ({ results, onSelect }) => {
  if (results.length === 0) {
    return (
      <div className="cpa-table-empty">
        Nenhum afiliado encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="cpa-table">
        <thead>
          <tr>
            <th>Afiliado</th>
            <th style={{ textAlign: "right" }}>Fronts <InfoTooltip text="Total de pedidos frontais (upsell_no=0) atribuídos ao afiliado no período selecionado." /></th>
            <th style={{ textAlign: "right" }}>Lucro líquido <InfoTooltip text="Earnings totais − COGs totais do afiliado. Verde = lucrativo, vermelho = operação deficitária no período." /></th>
            <th style={{ textAlign: "right" }}>Reembolso <InfoTooltip text="Taxa count-based de reembolsos + chargebacks do afiliado. Laranja ≤8%, vermelho >8%. Afeta o CPA máximo sustentável." /></th>
            <th style={{ textAlign: "right" }}>Upsell conv. <InfoTooltip text="% de pedidos front que geraram ao menos um upsell associado. Indicador de qualidade e intenção de compra do tráfego." /></th>
            <th style={{ textAlign: "right" }}>Kit dom. <InfoTooltip text="Variante (quantidade de potes) mais vendida por este afiliado — usada como referência principal para o cálculo de CPA." /></th>
            <th style={{ textAlign: "right" }}>CPA atual <InfoTooltip text="Valor de comissão por pedido front atualmente configurado para o afiliado na variante dominante." /></th>
            <th style={{ textAlign: "right" }}>CPA máx. <InfoTooltip text="CPA máximo sustentável calculado: LTV lucro/pedido × (1 − margem alvo%). Verde = pode aumentar, vermelho = deve reduzir." /></th>
            <th style={{ textAlign: "right" }}>Espaço <InfoTooltip text="CPA máx. − CPA atual. Positivo = margem disponível para aumentar comissão. Negativo = CPA acima do sustentável." /></th>
            <th style={{ textAlign: "center" }}>Status <InfoTooltip text="Increase: CPA pode subir sem risco. OK: CPA adequado à margem alvo. Reduce: CPA está acima do máximo sustentável." /></th>
            <th />
          </tr>
        </thead>
        <tbody>
          {results.map((aff) => {
            const domV = aff.variants.find(v => v.variant === aff.domVariant);

            const refColorClass = getRefundColor(aff.refundRate);
            const refColor: string | undefined = refColorClass === "red"
              ? "var(--red)"
              : refColorClass === "orange"
              ? "var(--amber)"
              : undefined;

            const roomColor: string | undefined = !domV ? undefined
              : domV.roomAboveCurrent > 0 ? "var(--green-text)"
              : domV.roomAboveCurrent < 0 ? "var(--red)"
              : undefined;

            const netColor = aff.netProfit >= 0 ? "var(--green-text)" : "var(--red)";

            return (
              <tr key={aff.name}>
                <td style={{ fontWeight: 600 }}>{aff.name}</td>
                <td className="num">{fmtInt(aff.frontTotal)}</td>
                <td className="num" style={{ color: netColor, fontWeight: 600 }}>
                  {fmtEur(aff.netProfit)}
                </td>
                <td className="num" style={refColor ? { color: refColor } : undefined}>
                  {fmtPct(aff.refundRate)}
                </td>
                <td className="num">{fmtPct(aff.upsellConvOverall)}</td>
                <td className="num">{domV ? `${domV.bottles} potes` : "—"}</td>
                <td className="num">{domV ? fmtEur(domV.cpaDefault) : "—"}</td>
                <td
                  className="num"
                  style={{
                    fontWeight: 600,
                    color: domV
                      ? domV.cpaStatus === "reduce" ? "var(--red)" : "var(--green-text)"
                      : undefined,
                  }}
                >
                  {domV ? fmtEur(domV.maxCpa) : "—"}
                </td>
                <td className="num" style={roomColor ? { color: roomColor, fontWeight: 600 } : undefined}>
                  {domV
                    ? `${domV.roomAboveCurrent >= 0 ? "+" : ""}${fmtEur(domV.roomAboveCurrent)}`
                    : "—"
                  }
                </td>
                <td style={{ textAlign: "center" }}>
                  {domV && <StatusBadge status={domV.cpaStatus} compact />}
                </td>
                <td>
                  <button
                    className="cpa-ver-btn"
                    onClick={() => onSelect(aff.name)}
                  >
                    Ver →
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CPATable;
