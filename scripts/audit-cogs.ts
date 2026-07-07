/**
 * Auditoria de Custos Operacionais com DADOS REAIS da Digistore.
 * Uso: npx tsx scripts/audit-cogs.ts [from] [to]   (default: -90d .. now)
 *
 * Valida, sobre transações reais:
 *  - reconciliação valorLiq = earnings − produto − frete − taxas − capital
 *  - Σ dailyCosts == totais do período (frete, taxas, produto, potes, pedidos)
 *  - reconciliação transação-a-transação (buildValorLiqBreakdown)
 *  - distribuição de versão por data (legado vs Tier 2)
 *  - países sem zona (custo 0) e spot-check de pedidos front vs a tabela
 */
import { fetchRows } from "./digiFetch";
import { computeFromFiltered, isPayment, isFrontSale, formatEur, formatInt } from "../src/lib/transactions";
import { buildValorLiqBreakdown } from "../src/lib/reconcile";
import {
  getFulfillmentBreakdown, detectBottles, closestBottleTier,
  resolveCountryCode, COUNTRY_ZONE, TIER2_EFFECTIVE_FROM,
} from "../src/lib/costTable";

const from = process.argv[2] ?? "-90d";
const to = process.argv[3] ?? "now";
const eur = (n: number) => formatEur(n);
const line = () => console.log("─".repeat(72));

const rows = await fetchRows(from, to);
console.log(`\n=== AUDITORIA COGS · janela ${from} .. ${to} · ${rows.length} transações ===`);
if (rows.length === 0) { console.log("Sem transações no período."); process.exit(0); }

const m = computeFromFiltered(rows);
const totalFulfillment = m.productCost + m.shippingCost + m.fulfillmentFees;

line();
console.log("TOTAIS DO PERÍODO");
console.log(`  Gross ................. ${eur(m.gross)}`);
console.log(`  Earnings ............. ${eur(m.earnings)}`);
console.log(`  Valor Líquido ........ ${eur(m.valorLiq)}`);
console.log(`  COGS (produto) ....... ${eur(m.productCost)}`);
console.log(`  Frete ................ ${eur(m.shippingCost)}`);
console.log(`  Taxas (emb+proc) ..... ${eur(m.fulfillmentFees)}  (emb ${eur(m.packagingCost)} + proc ${eur(m.processingCost)})`);
console.log(`  Custo de capital ..... ${eur(m.capitalCost)}`);
console.log(`  Fulfillment total .... ${eur(totalFulfillment)}`);
console.log(`  Potes vendidos ....... ${formatInt(m.bottlesSold)}`);
console.log(`  Pedidos únicos ....... ${formatInt(m.uniqueShippedOrders)}  (Vendas front: ${formatInt(m.sales)})`);
console.log(`  Custo médio/pedido ... ${eur(m.uniqueShippedOrders ? totalFulfillment / m.uniqueShippedOrders : 0)}`);

line();
console.log("RECONCILIAÇÕES (resíduo deve ser ~€0,00)");
const recLiq = m.valorLiq - (m.earnings - m.productCost - m.shippingCost - m.fulfillmentFees - m.capitalCost);
const sum = (k: "totalCost" | "shipping" | "fulfillmentFees" | "productCost" | "bottles" | "orders") =>
  m.dailyCosts.reduce((s, d) => s + d[k], 0);
console.log(`  valorLiq = earnings−prod−frete−taxas−capital  → resíduo ${eur(recLiq)}  ${Math.abs(recLiq) < 0.01 ? "✅" : "❌"}`);
console.log(`  Σ dailyCosts.shipping vs frete ............... resíduo ${eur(sum("shipping") - m.shippingCost)}  ${Math.abs(sum("shipping") - m.shippingCost) < 0.01 ? "✅" : "❌"}`);
console.log(`  Σ dailyCosts.taxas vs taxas ................. resíduo ${eur(sum("fulfillmentFees") - m.fulfillmentFees)}  ${Math.abs(sum("fulfillmentFees") - m.fulfillmentFees) < 0.01 ? "✅" : "❌"}`);
console.log(`  Σ dailyCosts.produto vs COGS ............... resíduo ${eur(sum("productCost") - m.productCost)}  ${Math.abs(sum("productCost") - m.productCost) < 0.01 ? "✅" : "❌"}`);
console.log(`  Σ dailyCosts.potes vs potes ............... ${sum("bottles")} vs ${m.bottlesSold}  ${sum("bottles") === m.bottlesSold ? "✅" : "❌"}`);
// Σ(pedidos distintos por dia) − pedidos distintos globais == nº de pedidos cujos
// fronts cruzam a meia-noite UTC (contados em 2 dias). Validação exata do gap.
const daysByOrder = new Map<string, Set<string>>();
for (const t of rows.filter(isFrontSale)) {
  const ok = t.orderId || `__row_${t.buyerId}_${t.date.getTime()}`;
  const dk = t.date.toISOString().slice(0, 10);
  let set = daysByOrder.get(ok); if (!set) { set = new Set(); daysByOrder.set(ok, set); }
  set.add(dk);
}
const crossDayOrders = [...daysByOrder.values()].filter((s) => s.size > 1).length;
const ordersGap = sum("orders") - m.uniqueShippedOrders;
console.log(`  Σ dailyCosts.pedidos − pedidos únicos = ${ordersGap}  (pedidos cruzando meia-noite UTC: ${crossDayOrders})  ${ordersGap === crossDayOrders ? "✅ explicado" : "❌"}`);
const b = buildValorLiqBreakdown(rows);
const recTx = b.totals.valorLiq - m.valorLiq;
console.log(`  breakdown tx-a-tx vs valorLiq global ...... resíduo ${eur(recTx)}  ${Math.abs(recTx) < 0.01 ? "✅" : "❌"}`);

line();
console.log("VERSIONAMENTO POR DATA (Tier 2 a partir de 2025-12-01)");
const pays = rows.filter(isPayment);
const preT2 = pays.filter((t) => t.date.getTime() < TIER2_EFFECTIVE_FROM).length;
const posT2 = pays.length - preT2;
console.log(`  Pagamentos pré-Tier2 (legado): ${preT2}   ·   Tier 2: ${posT2}`);

line();
console.log("COBERTURA DE PAÍSES (front) — países sem zona geram custo 0");
const unmapped = new Map<string, number>();
for (const t of pays.filter(isFrontSale)) {
  const cc = resolveCountryCode(t.country);
  if (!COUNTRY_ZONE[cc]) unmapped.set(cc || "(vazio)", (unmapped.get(cc || "(vazio)") ?? 0) + 1);
}
if (unmapped.size === 0) console.log("  ✅ todos os países de destino front estão mapeados numa zona");
else { console.log("  ⚠️ países SEM zona (custo de frete 0):"); for (const [c, n] of unmapped) console.log(`     ${c}: ${n} pedido(s)`); }

line();
console.log("SPOT-CHECK — 6 pedidos front (confira contra o PDF ShipOffers)");
console.log("  data       país z  frascos  produto   frete   emb   proc   total");
for (const t of pays.filter(isFrontSale).slice(0, 6)) {
  const cc = resolveCountryCode(t.country);
  const zone = COUNTRY_ZONE[cc] ?? "—";
  const br = getFulfillmentBreakdown(t.productName, t.country, true, t.date);
  const tier = closestBottleTier(detectBottles(t.productName));
  console.log(
    `  ${t.date.toISOString().slice(0, 10)} ${cc.padEnd(3)} ${String(zone).padEnd(2)}  ${String(tier).padStart(2)}     ` +
    `${eur(br.product).padStart(8)} ${eur(br.shipping).padStart(7)} ${eur(br.packaging).padStart(5)} ${eur(br.processing).padStart(5)} ${eur(br.total).padStart(8)}`
  );
}
line();
console.log("Dias no breakdown diário:", m.dailyCosts.length);
console.log("");
