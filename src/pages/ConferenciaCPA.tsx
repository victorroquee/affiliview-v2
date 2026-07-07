import React, { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import EmptyState from "../components/EmptyState";
import { computeFromFiltered, isMaileonardo, formatEur, formatInt, type TransactionRow } from "../lib/transactions";
import { analyzeCPA } from "../lib/cpa/analyzeCPA";

interface Props {
  filteredRows: TransactionRow[];
  loading: boolean;
}

const MARGINS = [0, 5, 10, 15];

const ConferenciaCPA: React.FC<Props> = ({ filteredRows, loading }) => {
  const [margin, setMargin] = useState(0);

  const metrics = useMemo(() => (filteredRows.length ? computeFromFiltered(filteredRows) : null), [filteredRows]);
  const model = useMemo(() => (filteredRows.length ? analyzeCPA(filteredRows, margin) : []), [filteredRows, margin]);

  const rows = useMemo(() => {
    if (!metrics) return [];
    // CPA máximo do modelo por afiliado (variante dominante)
    const maxByAff = new Map<string, number>();
    for (const a of model) {
      const dom = a.variants.find((v) => v.variant === a.domVariant) ?? a.variants[0];
      if (dom) maxByAff.set(a.name, dom.maxCpa);
    }
    return metrics.topAffiliates
      .filter((a) => !isMaileonardo(a.name) && a.sales > 0)
      .map((a) => {
        const maxCpa = maxByAff.get(a.name) ?? 0;
        const folga = maxCpa - a.cpa; // >0 = espaço; <0 = pagando acima do teto
        const status: "ok" | "watch" | "over" = folga < 0 ? "over" : folga < 3 ? "watch" : "ok";
        return { name: a.name, sales: a.sales, cpaReal: a.cpa, maxCpa, folga, status };
      })
      .sort((x, y) => x.folga - y.folga); // piores (menor folga) primeiro
  }, [metrics, model]);

  if (!metrics) return <EmptyState loading={loading} />;

  const overCount = rows.filter((r) => r.status === "over").length;

  return (
    <>
      <div className="section-header">
        <h2>Conferência de CPA</h2>
        <span className="section-sub">CPA real pago (affiliate_amount) vs CPA máximo do modelo · margem-alvo {margin}%</span>
      </div>

      <div className="conf-toolbar">
        <span className="conf-toolbar-label"><ShieldCheck size={13} strokeWidth={1.7} /> Margem-alvo:</span>
        {MARGINS.map((m) => (
          <button key={m} className={`product-tab ${margin === m ? "active" : ""}`} onClick={() => setMargin(m)}>{m}%</button>
        ))}
        <span className="conf-toolbar-note">
          {overCount > 0 ? `⚠️ ${overCount} afiliado(s) pagando acima do teto (folga negativa)` : "✅ nenhum afiliado acima do teto nesta margem"}
        </span>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Por afiliado</h3>
          <p>Folga = CPA máximo do modelo − CPA real pago. Negativo = risco (pagando mais do que o teto para a margem-alvo).</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Afiliado</th>
              <th style={{ textAlign: "right" }}>Vendas</th>
              <th style={{ textAlign: "right" }}>CPA real pago</th>
              <th style={{ textAlign: "right" }}>CPA máx (modelo)</th>
              <th style={{ textAlign: "right" }}>Folga</th>
              <th style={{ textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td className="num">{formatInt(r.sales)}</td>
                <td className="num">{formatEur(r.cpaReal)}</td>
                <td className="num">{formatEur(r.maxCpa)}</td>
                <td className={`num ${r.status === "over" ? "red" : r.status === "watch" ? "yellow" : "green"}`} style={{ fontWeight: 600 }}>{formatEur(r.folga)}</td>
                <td className="num">
                  <span className={`conf-badge ${r.status}`}>{r.status === "over" ? "Acima do teto" : r.status === "watch" ? "Atenção" : "OK"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ConferenciaCPA;
