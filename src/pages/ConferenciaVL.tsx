import React, { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { buildValorLiqBreakdown } from "../lib/reconcile";
import { formatEur, formatInt, type TransactionRow } from "../lib/transactions";

interface Props {
  filteredRows: TransactionRow[];
  loading: boolean;
}

const MAX_ROWS = 500;

const ConferenciaVL: React.FC<Props> = ({ filteredRows, loading }) => {
  const [affiliate, setAffiliate] = useState<string>("__all");

  const affiliates = useMemo(
    () => Array.from(new Set(filteredRows.map((r) => r.affiliate.trim()).filter(Boolean))).sort(),
    [filteredRows]
  );

  const breakdown = useMemo(
    () => buildValorLiqBreakdown(filteredRows, affiliate === "__all" ? undefined : affiliate),
    [filteredRows, affiliate]
  );

  if (filteredRows.length === 0) return <EmptyState loading={loading} />;

  const t = breakdown.totals;
  const shown = breakdown.lines.slice(0, MAX_ROWS);

  return (
    <>
      <div className="section-header">
        <h2>Conferência de Valor Líquido</h2>
        <span className="section-sub">Breakdown transação-a-transação para bater com o extrato Digistore centavo a centavo</span>
      </div>

      <div className="kpi-group">
        <div className="conf-vl-totals">
          <div><span>Transações</span><b>{formatInt(t.txCount)}</b></div>
          <div><span>Earnings</span><b>{formatEur(t.earningsKPI)}</b></div>
          <div><span>Produto</span><b>{formatEur(t.productCost)}</b></div>
          <div><span>Frete</span><b>{formatEur(t.shippingCost)}</b></div>
          <div><span>Taxas</span><b>{formatEur(t.fulfillmentFees)}</b></div>
          <div><span>Capital</span><b>{formatEur(t.capitalCost)}</b></div>
          <div className="conf-vl-liq"><span>Valor Líquido</span><b>{formatEur(t.valorLiq)}</b></div>
        </div>
      </div>

      <div className="conf-toolbar">
        <span className="conf-toolbar-label">Afiliado:</span>
        <select className="conf-select" value={affiliate} onChange={(e) => setAffiliate(e.target.value)}>
          <option value="__all">Todos ({affiliates.length})</option>
          {affiliates.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="conf-toolbar-note">
          {t.frontCount} front · {t.upsellCount} upsell · {t.refundCbCount} refund/CB
        </span>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Linhas {shown.length < breakdown.lines.length ? `(mostrando ${MAX_ROWS} de ${breakdown.lines.length})` : `(${breakdown.lines.length})`}</h3>
          <p>liq = earnings − produto − frete − taxas − capital (refund/CB: só earnings negativo, sem reverter COGS)</p>
        </div>
        <table className="conf-vl-table">
          <thead>
            <tr>
              <th>Data</th><th>Pedido</th><th>Tipo</th><th>Produto</th><th>Zona</th>
              <th style={{ textAlign: "right" }}>Frascos</th>
              <th style={{ textAlign: "right" }}>Earnings</th>
              <th style={{ textAlign: "right" }}>Produto</th>
              <th style={{ textAlign: "right" }}>Frete</th>
              <th style={{ textAlign: "right" }}>Taxas</th>
              <th style={{ textAlign: "right" }}>Capital</th>
              <th style={{ textAlign: "right" }}>Liq</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l, i) => (
              <tr key={`${l.orderId}-${i}`}>
                <td>{l.date.slice(8, 10)}/{l.date.slice(5, 7)}</td>
                <td className="mono">{l.orderId || "—"}</td>
                <td><span className={`conf-kind ${l.kind === "refund/cb" ? "refund" : l.kind}`}>{l.kind}</span></td>
                <td className="conf-vl-prod" title={l.product}>{l.product}</td>
                <td>{l.zone}</td>
                <td className="num">{l.bottles || "—"}</td>
                <td className="num">{formatEur(l.earnings)}</td>
                <td className="num">{l.productCost ? formatEur(l.productCost) : "—"}</td>
                <td className="num">{l.shippingCost ? formatEur(l.shippingCost) : "—"}</td>
                <td className="num">{l.fulfillmentFees ? formatEur(l.fulfillmentFees) : "—"}</td>
                <td className="num">{l.capitalCost ? formatEur(l.capitalCost) : "—"}</td>
                <td className="num" style={{ fontWeight: 600, color: l.liq < 0 ? "var(--red)" : undefined }}>{formatEur(l.liq)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ConferenciaVL;
