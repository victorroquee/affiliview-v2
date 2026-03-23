// ─── Dados acumulados por afiliado durante o loop ────────────────────────────
export interface AffiliateAccumulator {
  name: string;
  fronts: {
    [variant: number]: { count: number; earn: number; cogs: number };
  };
  upsells: {
    [variant: number]: { count: number; earn: number; cogs: number };
  };
  refundEarn:       number;
  cbEarn:           number;
  allOrders:        number;
  refundOrders:     number;
  cbOrders:         number;
  grossBruto:       number;   // soma de grossAmount de pagamentos (para denominador do refundRate)
  refundAmt:        number;   // soma dos |grossAmount| de refunds
  cbAmt:            number;   // soma dos |grossAmount| de chargebacks
  buyers:           Set<string>;
  buyersWithUpsell: Set<string>;
}

// ─── Resultado por variante de kit ────────────────────────────────────────────
export interface VariantResult {
  variant:          number;   // 1=M1, 2=M2, 3=M3
  bottles:          number;   // 2, 3 ou 6
  count:            number;   // nº de front orders
  frontEarnPer:     number;
  frontCogsPer:     number;
  upsellEarnPer:    number;
  upsellCogsPer:    number;
  ltvEarn:          number;
  ltvProfit:        number;
  upsellConv:       number;   // percentual
  cpaDefault:       number;
  maxCpa:           number;
  cpaStatus:        'increase' | 'ok' | 'reduce';
  roomAboveCurrent: number;   // maxCpa - cpaDefault
  vsOpLtvProfit:    number;
  vsOpUpsellConv:   number;
}

// ─── Resultado final por afiliado ─────────────────────────────────────────────
export interface AffiliateResult {
  name:               string;
  frontTotal:         number;
  domVariant:         number;
  variants:           VariantResult[];
  totalEarn:          number;
  totalCogs:          number;
  refundEarn:         number;  // inclui chargebacks (soma negativa)
  netProfit:          number;
  refundRate:         number;  // percentual
  upsellConvOverall:  number;  // percentual
}
