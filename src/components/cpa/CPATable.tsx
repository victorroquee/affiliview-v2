import React from "react";
import type { AffiliateResult } from "../../lib/cpa/types";
import { formatEur as fmtEur, formatPct as fmtPct, formatInt as fmtInt } from "../../lib/csvParser";
import StatusBadge from "./StatusBadge";

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
    <div className="table-container" style={{ overflowX: "auto" }}>
      <table className="cpa-table">
        <thead>
          <tr>
            <th>Afiliado</th>
            <th style={{ textAlign: "right" }}>Fronts</th>
            <th style={{ textAlign: "right" }}>Lucro líquido</th>
            <th style={{ textAlign: "right" }}>Reembolso</th>
            <th style={{ textAlign: "right" }}>Upsell conv.</th>
            <th style={{ textAlign: "right" }}>Kit dom.</th>
            <th style={{ textAlign: "right" }}>CPA atual</th>
            <th style={{ textAlign: "right" }}>CPA máx.</th>
            <th style={{ textAlign: "right" }}>Espaço</th>
            <th style={{ textAlign: "center" }}>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {results.map((aff, i) => {
            const domV     = aff.variants.find(v => v.variant === aff.domVariant);
            const refColor = aff.refundRate > 10
              ? "var(--red)"
              : aff.refundRate > 5
              ? "var(--amber)"
              : undefined;
            const roomColor = !domV ? undefined
              : domV.roomAboveCurrent > 0 ? "var(--green)"
              : domV.roomAboveCurrent < 0 ? "var(--red)"
              : undefined;

            return (
              <tr
                key={aff.name}
                className={i % 2 === 0 ? "cpa-row-even" : "cpa-row-odd"}
              >
                <td style={{ fontWeight: 600 }}>{aff.name}</td>
                <td className="num">{fmtInt(aff.frontTotal)}</td>
                <td className="num" style={{ color: "var(--green)", fontWeight: 700 }}>
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
                  style={{ fontWeight: 700, color: domV
                    ? domV.cpaStatus === "reduce" ? "var(--red)" : "var(--green)"
                    : undefined
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
