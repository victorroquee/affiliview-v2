/**
 * Auditoria de Payout Semanal com DADOS REAIS da Digistore.
 * Uso: npx tsx scripts/audit-payout.ts [from] [to]   (default: -120d .. now)
 *
 * Valida:
 *  - identidade global: totalExpected + pendingClearing + pendingReserve == earnings
 *  - cada semana: expectedPayout == cleared + reserveReleased + refunds
 *  - imprime o schedule semanal (para comparar com os saques reais da Digistore)
 */
import { fetchRows } from "./digiFetch";
import { computePayoutSchedule, buildPayoutEvents } from "../src/lib/payout";
import { isPayment, isRefund, isChargeback, formatEur } from "../src/lib/transactions";

const from = process.argv[2] ?? "-120d";
const to = process.argv[3] ?? "now";
const eur = (n: number) => formatEur(n);
const line = () => console.log("─".repeat(72));

const rows = await fetchRows(from, to);
console.log(`\n=== AUDITORIA PAYOUT · janela ${from} .. ${to} · ${rows.length} transações ===`);
if (rows.length === 0) { console.log("Sem transações no período."); process.exit(0); }

const s = computePayoutSchedule(rows);
const events = buildPayoutEvents(rows);
const earningsAll =
  rows.filter(isPayment).reduce((a, t) => a + t.earnings, 0) +
  rows.filter((t) => isRefund(t) || isChargeback(t)).reduce((a, t) => a + t.earnings, 0);

line();
console.log("RESUMO");
console.log(`  asOf ................. ${s.asOf}`);
console.log(`  Eventos gerados ...... ${events.length}`);
console.log(`  Próximo payout ....... ${s.nextPayoutDate ?? "—"}  →  ${eur(s.nextPayoutAmount)}`);
console.log(`  Reserva retida (D+60)  ${eur(s.pendingReserve)}`);
console.log(`  Em clearing (D+14) ... ${eur(s.pendingClearing)}`);
console.log(`  Total projetado ...... ${eur(s.totalExpected)}`);
console.log(`  Sextas puladas (4/mês) ${s.skippedFridays.length}`);

line();
console.log("RECONCILIAÇÃO (resíduo deve ser ~€0,00)");
// Conservação: todo euro de earnings (pagamentos 90%+10%, refunds/CB) é agendado
// em ALGUMA sexta → Σ semanas (totalExpected) == earnings totais.
const identity = s.totalExpected - earningsAll;
console.log(`  totalExpected vs earnings totais ............. resíduo ${eur(identity)}  ${Math.abs(identity) < 0.05 ? "✅" : "❌"}`);
// pendingClearing + pendingReserve = parte do totalExpected agendada APÓS o asOf
// (ainda não realizada). É um SUBCONJUNTO de totalExpected, não uma parcela extra.
const realizedSoFar = s.totalExpected - s.pendingClearing - s.pendingReserve;
console.log(`  realizado até asOf (= total − clearing − reserva) ... ${eur(realizedSoFar)}  (futuro: ${eur(s.pendingClearing + s.pendingReserve)})`);
const badWeek = s.weeks.find((w) => Math.abs(w.expectedPayout - (w.cleared + w.reserveReleased + w.refunds)) > 0.001);
console.log(`  expectedPayout == 90% + reserva + refunds (todas as semanas) ${badWeek ? "❌" : "✅"}`);

line();
console.log("SCHEDULE SEMANAL (compare 'Esperado' com o saque real da Digistore)");
console.log("  sexta        vendas    90%liberado   reserva10%    refunds     ESPERADO");
for (const w of s.weeks) {
  console.log(
    `  ${w.payoutDate}   ${String(w.salesCleared).padStart(5)}   ${eur(w.cleared).padStart(11)}  ${eur(w.reserveReleased).padStart(11)}  ${eur(w.refunds).padStart(10)}  ${eur(w.expectedPayout).padStart(11)}`
  );
}
line();
console.log("");
