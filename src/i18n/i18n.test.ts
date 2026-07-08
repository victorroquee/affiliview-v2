import { describe, it, expect } from "vitest";
import { createTranslator } from "./index";

describe("i18n createTranslator", () => {
  it("PT-BR retorna o texto em português", () => {
    const t = createTranslator("pt-BR");
    expect(t("nav.settings")).toBe("Configurações");
  });

  it("EN retorna o texto em inglês", () => {
    const t = createTranslator("en");
    expect(t("nav.settings")).toBe("Settings");
  });

  it("chave ausente cai para a própria chave", () => {
    const t = createTranslator("en");
    expect(t("chave.que.nao.existe")).toBe("chave.que.nao.existe");
  });

  it("interpola parâmetros entre chaves", () => {
    const t = createTranslator("pt-BR");
    expect(t("settings.fx.updated", { date: "07/07 12:00" })).toBe("Atualizado em 07/07 12:00");
  });
});
