import React from "react";
import { Boxes, Package, Truck, ShoppingBag, Receipt, Coins } from "lucide-react";
import KPICard from "./KPICard";
import type { PeriodMetrics } from "../lib/transactions";
import { formatEur, formatInt } from "../lib/transactions";

const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Painel de Custos Operacionais: COGS, potes, frete, pedidos, taxas + tabela diária. */
const OperationalCosts: React.FC<{ metrics: PeriodMetrics }> = ({ metrics }) => {
  const totalFulfillment = metrics.productCost + metrics.shippingCost + metrics.fulfillmentFees;
  const avgPerOrder = metrics.uniqueShippedOrders > 0 ? totalFulfillment / metrics.uniqueShippedOrders : 0;
  const avgShip = metrics.uniqueShippedOrders > 0 ? metrics.shippingCost / metrics.uniqueShippedOrders : 0;

  return (
    <>
      <div className="section-header">
        <h2>Custos Operacionais</h2>
      </div>

      <div className="kpi-group">
        <div className="kpi-grid">
          <KPICard
            icon={Boxes}
            label="COGS (Produto)"
            value={formatEur(metrics.productCost)}
            info="Custo de fabricação dos frascos de TODOS os pagamentos (front + upsells). Não inclui frete nem taxas."
          />
          <KPICard
            icon={Package}
            label="Potes Vendidos"
            value={formatInt(metrics.bottlesSold)}
            info="Total de frascos físicos vendidos no período (front + upsells; bundles N+M contam os grátis)."
          />
          <KPICard
            icon={Truck}
            label="Frete"
            value={formatEur(metrics.shippingCost)}
            info={`Custo de envio ao cliente (só pedidos front — upsell vai no mesmo pacote). Médio por pedido: ${formatEur(avgShip)}.`}
          />
          <KPICard
            icon={ShoppingBag}
            label="Pedidos Únicos"
            value={formatInt(metrics.uniqueShippedOrders)}
            info="Pedidos front distintos — cada um é um pacote físico que paga frete uma vez. É a base para o custo de shipping."
          />
          <KPICard
            icon={Receipt}
            label="Taxas de Fulfillment"
            value={formatEur(metrics.fulfillmentFees)}
            info={`Embalagem (${formatEur(metrics.packagingCost)}) + processing (${formatEur(metrics.processingCost)}). Só pedidos front, tarifas Tier 2 (a partir de 2025-12-01).`}
          />
          <KPICard
            icon={Coins}
            label="Custo Total de Fulfillment"
            value={formatEur(totalFulfillment)}
            info={`COGS + frete + taxas de fulfillment. Custo médio por pedido: ${formatEur(avgPerOrder)}. (Custo de capital fica no Valor Líquido.)`}
            color="green"
          />
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Custos por dia</h3>
          <p>COGS, frete e taxas consolidados por dia — o custo de capital não entra aqui (ver Valor Líquido)</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th style={{ textAlign: "right" }}>Pedidos</th>
              <th style={{ textAlign: "right" }}>Potes</th>
              <th style={{ textAlign: "right" }}>COGS</th>
              <th style={{ textAlign: "right" }}>Frete</th>
              <th style={{ textAlign: "right" }}>Taxas</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {metrics.dailyCosts.map((d) => (
              <tr key={d.date}>
                <td style={{ fontWeight: 600 }}>{fmtDate(d.date)}</td>
                <td className="num">{formatInt(d.orders)}</td>
                <td className="num">{formatInt(d.bottles)}</td>
                <td className="num">{formatEur(d.productCost)}</td>
                <td className="num">{formatEur(d.shipping)}</td>
                <td className="num">{formatEur(d.fulfillmentFees)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{formatEur(d.totalCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="table-total-row">
              <td style={{ fontWeight: 700 }}>Total</td>
              <td className="num" style={{ fontWeight: 700 }}>{formatInt(metrics.uniqueShippedOrders)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{formatInt(metrics.bottlesSold)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{formatEur(metrics.productCost)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{formatEur(metrics.shippingCost)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{formatEur(metrics.fulfillmentFees)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{formatEur(totalFulfillment)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};

export default OperationalCosts;
