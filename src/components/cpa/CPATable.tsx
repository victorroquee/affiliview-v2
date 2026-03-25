import React from "react";
import type { AffiliateResult } from "../../lib/cpa/types";
import { formatEur as fmtEur, formatPct as fmtPct, formatInt as fmtInt } from "../../lib/transactions";
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
    <div className="table-container">
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
          {results.map((aff) => {
            const domV = aff.variants.find(v => v.variant === aff.domVariant);

            const refColor: string | undefined = aff.refundRate > 10
              ? "var(--red)"
              : aff.refundRate > 5
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
