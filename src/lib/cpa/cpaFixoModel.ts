import type { TransactionRow } from "../transactions";
import { isPayment, isRefund, isChargeback, isMaileonardo } from "../transactions";
import { getFrontVariant } from "./parseHelpers";

// ─── Constantes (porte fiel de calculadora_cpa.html) ─────────────────────────
export const MIX_PRICES = { M1: 156, M2: 207, M3: 294 } as const;
export const MIX_POTS = { M1: 2, M2: 3, M3: 6 } as const;
export const UPSELL_AVG_PRICE = 175;
export const MARGINS = [5, 7, 8, 10, 12, 15] as const;
export const VAT_PRESETS = { DE: 7, AT: 10, CH: 2.6 } as const;

// Mix fixo do modo automático
const AUTO_MIX = { M1: 0.06, M2: 0.27, M3: 0.67 } as const;
const AUTO_UPSELL_POTS = 7.6;

// ─── Inputs ───────────────────────────────────────────────────────────────────
// Percentuais em unidades de input (10 = 10%), como no HTML.
export interface CpaFixoInputs {
  aov: number;
  refund: number;          // %
  mixMode: "auto" | "manual";
  mixM1: number;           // % (manual)
  mixM2: number;           // % (manual)
  mixM3: number;           // % (manual)
  upsellRate: number;      // % (manual)
  upsellPots: number;      // potes por upsell (manual)
  costPerPot: number;      // €
  shipping: number;        // € por venda FE
  digi: number;            // % Digistore
  retention: number;       // % retido (reserva)
  vat: number;             // % VAT efetivo
  pctDE: number;           // % vendas DE (para VAT mix)
  pctAT: number;           // % vendas AT
  pctCH: number;           // % vendas CH
  capitalRate: number;     // % a.a. custo de capital
  retentionDays: number;   // dias de retenção
  testCPA: number;         // € CPA simulado
  volume: number;          // vendas/mês
}

export const DEFAULT_INPUTS: CpaFixoInputs = {
  aov: 300,
  refund: 10,
  mixMode: "auto",
  mixM1: 6,
  mixM2: 27,
  mixM3: 67,
  upsellRate: 25,
  upsellPots: 7.6,
  costPerPot: 3.26,
  shipping: 7.58,
  digi: 10.34,
  retention: 10,
  vat: 7,
  pctDE: 85,
  pctAT: 9,
  pctCH: 5,
  capitalRate: 20,
  retentionDays: 60,
  testCPA: 180,
  volume: 300,
};

// ─── Outputs ──────────────────────────────────────────────────────────────────
export interface CpaFixoAlert {
  type: "warning" | "danger";
  text: string;
}

export interface CpaFixoOutputs {
  realAOV: number;
  sobra: number;
  netRevenue: number;
  effCapital: number;          // fração (0,00329 = 0,329%)
  fePrice: number;
  upsellRate: number;          // fração
  mix: { M1: number; M2: number; M3: number }; // frações normalizadas
  breakdown: {
    vatCost: number;
    productCost: number;
    shipCost: number;
    digiCost: number;
    capitalCost: number;
    totalPots: number;
  };
  rows: { margin: number; cpa: number; profit: number }[];
  alerts: CpaFixoAlert[];
  simulator: {
    profitPerSale: number;
    marginPct: number;
    monthlyProfit: number;
    monthlyRevenue: number;
  };
}

const fmtEur = (n: number) =>
  "€" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(/\.(\d{2})$/, ",$1");
const fmtPct = (n: number) => n.toFixed(2) + "%";

// ─── Cálculo principal (porte fiel de calculate()) ───────────────────────────
export function computeCpaFixo(inputs: CpaFixoInputs): CpaFixoOutputs {
  const aov = inputs.aov || 0;
  const refund = (inputs.refund || 0) / 100;
  const costPot = inputs.costPerPot || 0;
  const ship = inputs.shipping || 0;
  const digi = (inputs.digi || 0) / 100;
  const vatPct = (inputs.vat || 0) / 100;

  // Custo de capital efetivo
  const capRate = (inputs.capitalRate || 0) / 100;
  const retPct = (inputs.retention || 0) / 100;
  const retDays = inputs.retentionDays || 0;
  const effCapital = retPct * (retDays / 365) * capRate;

  // ── MIX ──
  let mixM1: number, mixM2: number, mixM3: number;
  let fePrice: number, fePots: number, upsellRate: number, upsellPots: number;

  if (inputs.mixMode === "auto") {
    mixM1 = AUTO_MIX.M1; mixM2 = AUTO_MIX.M2; mixM3 = AUTO_MIX.M3;
    fePrice = mixM1 * MIX_PRICES.M1 + mixM2 * MIX_PRICES.M2 + mixM3 * MIX_PRICES.M3;
    fePots = mixM1 * MIX_POTS.M1 + mixM2 * MIX_POTS.M2 + mixM3 * MIX_POTS.M3;
    upsellPots = AUTO_UPSELL_POTS;
    // taxa de upsell derivada para atingir o AOV informado
    upsellRate = Math.max(0, (aov - fePrice) / UPSELL_AVG_PRICE);
  } else {
    mixM1 = (inputs.mixM1 || 0) / 100;
    mixM2 = (inputs.mixM2 || 0) / 100;
    mixM3 = (inputs.mixM3 || 0) / 100;
    const total = mixM1 + mixM2 + mixM3;
    if (total > 0) { mixM1 /= total; mixM2 /= total; mixM3 /= total; }
    fePrice = mixM1 * MIX_PRICES.M1 + mixM2 * MIX_PRICES.M2 + mixM3 * MIX_PRICES.M3;
    fePots = mixM1 * MIX_POTS.M1 + mixM2 * MIX_POTS.M2 + mixM3 * MIX_POTS.M3;
    upsellRate = (inputs.upsellRate || 0) / 100;
    upsellPots = inputs.upsellPots || 0;
  }

  // ── AOV real e custos por venda FE ──
  const realAOV = fePrice + upsellRate * UPSELL_AVG_PRICE;
  const gross = realAOV; // gross COM VAT (como vem da Digistore)

  const vatCost = gross - gross / (1 + vatPct);
  const totalPots = fePots + upsellRate * upsellPots;
  const productCost = totalPots * costPot;
  const shipCost = ship; // 1 shipping por venda FE
  const digiCost = gross * digi;
  const capitalCost = gross * effCapital;

  const netRevenue = gross * (1 - refund);
  const totalCosts = vatCost + productCost + shipCost + digiCost + capitalCost;
  const sobra = netRevenue - totalCosts;

  // ── Tabela CPA por margem ──
  const rows = MARGINS.map((m) => {
    const marginTarget = (m / 100) * netRevenue;
    return { margin: m, cpa: sobra - marginTarget, profit: marginTarget };
  });

  // ── Alertas (idênticos ao HTML) ──
  const alerts: CpaFixoAlert[] = [];
  if (inputs.mixMode === "auto" && upsellRate > 0.6) {
    alerts.push({
      type: "warning",
      text: `Taxa de upsell calculada em ${fmtPct(upsellRate * 100)} — muito alta. Provavelmente este afiliado tem upsells de valor médio diferente do padrão (€${UPSELL_AVG_PRICE}). Considere usar o modo manual.`,
    });
  }
  if (inputs.mixMode === "auto" && upsellRate <= 0) {
    alerts.push({
      type: "danger",
      text: `AOV de ${fmtEur(aov)} é menor que o preço médio do FE puro (${fmtEur(fePrice)}). Este afiliado vende mix ruim (muito M1/M2). Use o modo manual para refletir.`,
    });
  }
  if (rows[3]!.cpa < 0) {
    alerts.push({
      type: "danger",
      text: "CPA negativo a 10% de margem — operação inviável com este AOV e custos. Reduza margem ou aumente AOV.",
    });
  }
  if (refund > 0.15) {
    alerts.push({
      type: "warning",
      text: `Reembolso de ${fmtPct(refund * 100)} acima do normal (10%) — margem comprimida. Considere renegociar ou pausar.`,
    });
  }

  // ── Simulador de CPA fixo ──
  const testCPA = inputs.testCPA || 0;
  const volume = inputs.volume || 0;
  const profitPerSale = sobra - testCPA;
  const marginPct = netRevenue > 0 ? (profitPerSale / netRevenue) * 100 : 0;

  return {
    realAOV,
    sobra,
    netRevenue,
    effCapital,
    fePrice,
    upsellRate,
    mix: { M1: mixM1, M2: mixM2, M3: mixM3 },
    breakdown: { vatCost, productCost, shipCost, digiCost, capitalCost, totalPots },
    rows,
    alerts,
    simulator: {
      profitPerSale,
      marginPct,
      monthlyProfit: profitPerSale * volume,
      monthlyRevenue: netRevenue * volume,
    },
  };
}

// ─── VAT mix ponderado por país (porte de calcMixVAT) ────────────────────────
export function computeVatMix(pctDE: number, pctAT: number, pctCH: number): number {
  const total = (pctDE || 0) + (pctAT || 0) + (pctCH || 0);
  if (total <= 0) return 0;
  return ((pctDE || 0) * VAT_PRESETS.DE + (pctAT || 0) * VAT_PRESETS.AT + (pctCH || 0) * VAT_PRESETS.CH) / total;
}

// ─── Auto-fill por afiliado (dados reais da API) ─────────────────────────────
export interface AffiliateInput {
  name: string;
  aov: number;                              // gross c/ VAT, incl. upsells, por front order
  refundRate: number;                       // fração da receita (refunds+CB / gross pagamentos)
  mix: { M1: number; M2: number; M3: number }; // % por variante (soma 100)
  frontOrders: number;
}

export function aggregateAffiliateInputs(rows: TransactionRow[]): AffiliateInput[] {
  const map = new Map<
    string,
    { counts: { M1: number; M2: number; M3: number }; frontCount: number; frontGross: number; upsellGross: number; refundAmt: number }
  >();

  const getEntry = (name: string) => {
    let e = map.get(name);
    if (!e) {
      e = { counts: { M1: 0, M2: 0, M3: 0 }, frontCount: 0, frontGross: 0, upsellGross: 0, refundAmt: 0 };
      map.set(name, e);
    }
    return e;
  };

  for (const t of rows) {
    const name = t.affiliate.trim();
    if (!name || name === "(direto)" || isMaileonardo(name)) continue;

    if (isPayment(t) && t.upsellNo === 0) {
      const v = getFrontVariant(t.productName);
      if (v === null || v === 4) continue; // só M1/M2/M3 entram no mix
      const e = getEntry(name);
      e.counts[`M${v}` as "M1" | "M2" | "M3"] += 1;
      e.frontCount += 1;
      e.frontGross += t.grossAmount;
    } else if (isPayment(t) && t.upsellNo > 0) {
      getEntry(name).upsellGross += t.grossAmount;
    } else if (isRefund(t) || isChargeback(t)) {
      getEntry(name).refundAmt += t.grossAmount;
    }
  }

  return Array.from(map.entries())
    .filter(([, e]) => e.frontCount > 0)
    .map(([name, e]) => {
      const grossTotal = e.frontGross + e.upsellGross;
      return {
        name,
        aov: e.frontCount > 0 ? grossTotal / e.frontCount : 0,
        refundRate: grossTotal > 0 ? e.refundAmt / grossTotal : 0,
        mix: {
          M1: (e.counts.M1 / e.frontCount) * 100,
          M2: (e.counts.M2 / e.frontCount) * 100,
          M3: (e.counts.M3 / e.frontCount) * 100,
        },
        frontOrders: e.frontCount,
      };
    })
    .sort((a, b) => b.frontOrders - a.frontOrders);
}
