import React from "react";
import type { SimulatedAffiliateResult } from "../../lib/cpa/types";
import { formatEur, formatPct, formatInt } from "../../lib/transactions";
import InfoTooltip from "../InfoTooltip";
import StatusBadge from "./StatusBadge";

interface CpaVariavelTableProps {
  results: SimulatedAffiliateResult[];
  marginTarget: number;
  onSelect: (name: string) => void;
}

const CpaVariavelTable: React.FC<CpaVariavelTableProps> = ({ results, marginTarget, onSelect }) => {
  const showSim = marginTarget > 0;

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
            <th style={{ textAlign: "right" }}>Fronts</th>
            <th style={{ textAlign: "right" }}>
              Lucro LTV{" "}
              <InfoTooltip text="Lucro por pedido front incluindo upsells - COGS. Baseado na variante dominante do afiliado." />
            </th>
            <th style={{ textAlign: "right" }}>
              AOV{" "}
              <InfoTooltip text="Valor medio bruto por pedido front (front + upsells atribuidos). Baseado na variante dominante." />
            </th>
            <th style={{ textAlign: "right" }}>Reembolso</th>
            <th style={{ textAlign: "right" }}>Conv. upsell</th>
            <th style={{ textAlign: "right" }}>Kit dom.</th>
            <th style={{ textAlign: "right" }}>M1/M2/M3</th>
            {showSim && (
              <th style={{ textAlign: "right" }}>
                CPA max (sim)
                <InfoTooltip text="CPA maximo calculado para a margem alvo definida. Por variante dominante." />
              </th>
            )}
            {showSim && (
              <th style={{ textAlign: "right" }}>
                Status
              </th>
            )}
            <th />
          </tr>
        </thead>
        <tbody>
          {results.map((aff) => {
            const domV = aff.variants.find(v => v.variant === aff.domVariant);

            const ltvColor = domV
              ? domV.ltvProfit >= 0 ? "var(--green-text)" : "var(--red)"
              : undefined;

            const refColor: string | undefined = aff.refundRate > 10
              ? "var(--red)"
              : aff.refundRate > 5
              ? "var(--amber)"
              : undefined;

            return (
              <tr key={aff.name}>
                <td style={{ fontWeight: 600 }}>{aff.name}</td>
                <td className="num">{formatInt(aff.frontTotal)}</td>
                <td className="num" style={{ color: ltvColor, fontWeight: 600 }}>
                  {domV ? formatEur(domV.ltvProfit) : "—"}
                </td>
                <td className="num">
                  {domV ? formatEur(domV.aovGross ?? 0) : "—"}
                </td>
                <td className="num" style={refColor ? { color: refColor } : undefined}>
                  {formatPct(aff.refundRate)}
                </td>
                <td className="num">{formatPct(aff.upsellConvOverall)}</td>
                <td className="num">{domV ? `${domV.bottles} potes` : "—"}</td>
                <td className="num">
                  {aff.variants.map(v => (
                    <span
                      key={v.variant}
                      className="variant-badge"
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        marginRight: "4px",
                        background: "var(--bg-secondary)",
                        color: v.ltvProfit >= 0 ? "var(--green-text)" : "var(--red)",
                      }}
                    >
                      M{v.variant} {formatEur(v.ltvProfit)}
                    </span>
                  ))}
                </td>
                {showSim && (() => {
                  const domSV = aff.variants.find(v => v.variant === aff.domVariant);
                  return (
                    <>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {domSV ? formatEur(domSV.simMaxCpa) : "—"}
                      </td>
                      <td>
                        {domSV ? <StatusBadge status={domSV.simCpaStatus} compact /> : "—"}
                      </td>
                    </>
                  );
                })()}
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

export default CpaVariavelTable;
