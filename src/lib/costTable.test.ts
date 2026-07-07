import { describe, it, expect } from "vitest";
import { getFulfillmentBreakdown, getFulfillmentCost } from "./costTable";

// Datas de referência para o versionamento por vigência
const TIER2 = new Date("2026-01-15T00:00:00Z"); // ≥ 2025-12-01 → Tier 2
const LEGACY = new Date("2025-06-15T00:00:00Z"); // < 2025-12-01 → legado

// Zona → país (evita LU/CH em z6 p/ não disparar o desconto de €20)
const Z = { z1: "DE", z2: "PT", z3: "IT", z4: "DK", z5: "SE", z6: "CY", z7: "CA", uk: "GB" };

describe("costTable — fidelidade Tier 2 vs PDF ShipOffers (Slimjara 3,26/frasco)", () => {
  // (frascos, zona, Total Cost do PDF) — product+shipping+packaging+processing
  const cases: [number, keyof typeof Z, number][] = [
    [1, "z1", 12.56], [1, "z2", 13.40], [1, "z3", 15.08], [1, "z4", 16.92],
    [1, "z5", 21.07], [1, "z6", 28.45], [1, "z7", 54.29], [1, "uk", 13.40],
    [2, "z1", 15.82], [2, "z7", 57.55],
    [3, "z5", 27.59], [3, "z6", 34.97], [3, "uk", 19.92],
    [6, "z1", 28.98], [6, "z7", 70.71], [6, "z6", 44.87],
    [9, "z6", 56.00], [9, "z4", 43.47], [9, "z1", 38.94],
    [12, "z2", 49.71], [12, "z7", 91.68], [12, "z5", 57.42],
  ];

  for (const [bottles, zone, total] of cases) {
    it(`${bottles} frasco(s) ${zone} → Total ${total}`, () => {
      const b = getFulfillmentBreakdown(`Slimjara ${bottles} Bottles`, Z[zone], true, TIER2);
      expect(b.product + b.shipping + b.packaging + b.processing).toBeCloseTo(total, 2);
      expect(b.total).toBeCloseTo(total, 2);
    });
  }

  it("componentes granulares batem (1 frasco z1)", () => {
    const b = getFulfillmentBreakdown("Slimjara 1 Bottle", Z.z1, true, TIER2);
    expect(b.product).toBeCloseTo(3.26, 2);
    expect(b.shipping).toBeCloseTo(8.60, 2);
    expect(b.packaging).toBeCloseTo(0.23, 2);
    expect(b.processing).toBeCloseTo(0.47, 2);
  });

  it("embalagem muda de 0,23 (≤3) para 0,35 (≥6)", () => {
    expect(getFulfillmentBreakdown("Slimjara 3 Bottles", Z.z1, true, TIER2).packaging).toBeCloseTo(0.23, 2);
    expect(getFulfillmentBreakdown("Slimjara 6 Bottles", Z.z1, true, TIER2).packaging).toBeCloseTo(0.35, 2);
  });

  it("processing é €0,47 flat em todos os tiers", () => {
    for (const n of [1, 2, 3, 6, 9, 12]) {
      expect(getFulfillmentBreakdown(`Slimjara ${n} Bottles`, Z.z1, true, TIER2).processing).toBeCloseTo(0.47, 2);
    }
  });
});

describe("costTable — versionamento por data de vigência", () => {
  it("antes de 2025-12-01 usa o frete legado e sem taxas", () => {
    const b = getFulfillmentBreakdown("Slimjara 1 Bottle", Z.z1, true, LEGACY);
    expect(b.product).toBeCloseTo(3.26, 2);
    expect(b.shipping).toBeCloseTo(7.58, 2); // frete legado z1@1
    expect(b.packaging).toBe(0);
    expect(b.processing).toBe(0);
    expect(b.total).toBeCloseTo(10.84, 2);
  });

  it("a partir de 2025-12-01 usa Tier 2 (frete maior + taxas)", () => {
    const b = getFulfillmentBreakdown("Slimjara 1 Bottle", Z.z1, true, TIER2);
    expect(b.shipping).toBeCloseTo(8.60, 2);
    expect(b.total).toBeCloseTo(12.56, 2);
  });
});

describe("costTable — regra Z6 (cliente paga €20) sob Tier 2", () => {
  it("front LU/CH desconta €20 só do frete; embalagem/processing intactos", () => {
    const b = getFulfillmentBreakdown("Slimjara 6 Bottles", "CH", true, TIER2);
    expect(b.shipping).toBeCloseTo(4.49, 2); // 24,49 − 20
    expect(b.packaging).toBeCloseTo(0.35, 2);
    expect(b.processing).toBeCloseTo(0.47, 2);
    expect(b.total).toBeCloseTo(19.56 + 4.49 + 0.35 + 0.47, 2);
  });

  it("CY (z6 fora do set de desconto) mantém frete cheio", () => {
    const b = getFulfillmentBreakdown("Slimjara 6 Bottles", "CY", true, TIER2);
    expect(b.shipping).toBeCloseTo(24.49, 2);
  });
});

describe("costTable — getFulfillmentCost inclui taxas sob Tier 2", () => {
  it("retorna o total (produto+frete+embalagem+processing)", () => {
    expect(getFulfillmentCost("Slimjara 1 Bottle", Z.z1, true, TIER2)).toBeCloseTo(12.56, 2);
  });
});
