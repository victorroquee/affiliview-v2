import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import Settings from "./Settings";

// Estado mutável compartilhado com o mock (lido a cada render).
const h = vi.hoisted(() => ({
  currency: "EUR" as string,
  fxManual: false,
  fxBrl: null as number | null,
  fxUsd: null as number | null,
  fxUpdatedAt: null as string | null,
  fxUnavailable: false,
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    session: { user: { email: "user@og.com" } },
    user: null, loading: false,
    signIn: async () => ({ error: null }), signOut: async () => {},
  }),
}));

vi.mock("../hooks/useSettings", () => ({
  useSettings: () => ({
    settings: {
      accountName: "OG Group", displayName: "OG Group",
      currency: h.currency, language: "pt-BR",
      fxBrl: h.fxBrl, fxUsd: h.fxUsd, fxManual: h.fxManual, fxUpdatedAt: h.fxUpdatedAt,
    },
    loading: false, saving: false, saveError: null, fxUnavailable: h.fxUnavailable,
    t: (k: string) => k, update: async () => {}, refreshFx: async () => {},
  }),
}));

afterEach(cleanup);

describe("smoke: página de Configurações", () => {
  it("renderiza sem crash em EUR (câmbio oculto)", () => {
    h.currency = "EUR";
    expect(() => render(<Settings />)).not.toThrow();
  });

  it("mostra a seção de câmbio quando moeda ≠ EUR", () => {
    h.currency = "BRL";
    h.fxBrl = 6.24; h.fxUsd = 1.08; h.fxUpdatedAt = "2026-07-07T10:00:00Z";
    expect(() => render(<Settings />)).not.toThrow();
  });

  it("não quebra com câmbio manual e cotação indisponível", () => {
    h.currency = "USD"; h.fxManual = true; h.fxUnavailable = true;
    expect(() => render(<Settings />)).not.toThrow();
  });
});
