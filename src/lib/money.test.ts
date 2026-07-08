import { describe, it, expect, beforeEach } from "vitest";
import { formatMoney, formatEur, formatInt, formatMoneyShort } from "./transactions";
import { setMoneyState, resolveDisplayMoney } from "./settingsStore";

describe("formatMoney — conversão por moeda ativa", () => {
  beforeEach(() => setMoneyState({ currency: "EUR", language: "pt-BR", rate: 1 }));

  it("EUR: mantém valor e símbolo €, locale de-DE", () => {
    expect(formatMoney(1234.5)).toBe("€1.234,50");
  });

  it("formatEur é alias currency-aware de formatMoney", () => {
    setMoneyState({ currency: "BRL", rate: 6 });
    expect(formatEur(100)).toBe(formatMoney(100));
  });

  it("BRL: converte pela taxa e usa R$ + locale pt-BR", () => {
    setMoneyState({ currency: "BRL", rate: 6 });
    expect(formatMoney(100)).toBe("R$ 600,00");
  });

  it("USD: converte pela taxa e usa $ + locale en-US", () => {
    setMoneyState({ currency: "USD", rate: 1.1 });
    expect(formatMoney(1000)).toBe("$1,100.00");
  });

  it("formatInt segue o locale do idioma (não converte valor)", () => {
    setMoneyState({ language: "pt-BR" });
    expect(formatInt(1234567)).toBe("1.234.567");
    setMoneyState({ language: "en" });
    expect(formatInt(1234567)).toBe("1,234,567");
  });

  it("formatMoneyShort: compacto na moeda ativa (k) com conversão", () => {
    setMoneyState({ currency: "EUR", language: "pt-BR", rate: 1 });
    expect(formatMoneyShort(0)).toBe("—");
    expect(formatMoneyShort(12000)).toBe("€12k");
    setMoneyState({ currency: "BRL", rate: 6 });
    expect(formatMoneyShort(12000)).toBe("R$ 72k"); // 72.000 → 72k
  });
});

describe("resolveDisplayMoney — fallback para EUR sem cotação", () => {
  it("EUR sempre taxa 1", () => {
    expect(resolveDisplayMoney("EUR", null, null)).toEqual({ currency: "EUR", rate: 1 });
  });

  it("BRL com cotação usa a taxa", () => {
    expect(resolveDisplayMoney("BRL", 6.2, null)).toEqual({ currency: "BRL", rate: 6.2 });
  });

  it("BRL/USD SEM cotação cai para EUR (evita grandeza euro com símbolo R$/$ ~6× errado)", () => {
    expect(resolveDisplayMoney("BRL", null, null)).toEqual({ currency: "EUR", rate: 1 });
    expect(resolveDisplayMoney("USD", null, null)).toEqual({ currency: "EUR", rate: 1 });
  });

  it("taxa inválida (≤0) também cai para EUR", () => {
    expect(resolveDisplayMoney("USD", null, 0)).toEqual({ currency: "EUR", rate: 1 });
    expect(resolveDisplayMoney("BRL", -1, null)).toEqual({ currency: "EUR", rate: 1 });
  });
});
