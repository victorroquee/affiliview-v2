/*
 * settingsStore — singleton module-level lido de forma SÍNCRONA pelos formatadores
 * de valores (formatMoney/formatEur/formatInt em transactions.ts).
 *
 * Por que um singleton e não só o Context: formatEur é uma função pura chamada
 * durante o render em ~18 arquivos. Ela precisa saber a moeda/idioma/taxa ativos
 * sem virar hook. O SettingsProvider espelha o estado aqui a cada mudança.
 */

export type CurrencyCode = "EUR" | "BRL" | "USD";
export type LanguageCode = "pt-BR" | "en";

interface MoneyState {
  currency: CurrencyCode;
  language: LanguageCode;
  /** Taxa de conversão EUR → moeda ativa (EUR = 1). */
  rate: number;
}

/** Metadados de exibição por moeda. `symbol` já inclui o espaçamento desejado. */
export const CURRENCY_META: Record<CurrencyCode, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol: "€", locale: "de-DE", label: "Euro (€)" },
  BRL: { symbol: "R$ ", locale: "pt-BR", label: "Real (R$)" },
  USD: { symbol: "$", locale: "en-US", label: "Dólar ($)" },
};

/** Locale usado para contagens/inteiros, atrelado ao IDIOMA (não converte valor). */
const NUMBER_LOCALE: Record<LanguageCode, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
};

// Estado inicial = comportamento idêntico ao de hoje (EUR, pt-BR, taxa 1)
// até o SettingsProvider carregar as preferências do Supabase.
let state: MoneyState = { currency: "EUR", language: "pt-BR", rate: 1 };

export function setMoneyState(next: Partial<MoneyState>): void {
  state = { ...state, ...next };
}

export function getMoneyState(): Readonly<MoneyState> {
  return state;
}

export function currencyMeta(c: CurrencyCode) {
  return CURRENCY_META[c];
}

export function numberLocale(l: LanguageCode): string {
  return NUMBER_LOCALE[l] ?? "pt-BR";
}

/**
 * Resolve a moeda de EXIBIÇÃO efetiva + a taxa EUR→moeda.
 *
 * Se a moeda ativa não for EUR mas a cotação ainda não carregou (null/≤0), cai de
 * volta para EUR. Isso evita o bug silencioso de exibir a grandeza em euro já com o
 * símbolo R$/US$ (valor ~6× errado) quando o fetch de câmbio falha ou não rodou.
 */
export function resolveDisplayMoney(
  currency: CurrencyCode,
  fxBrl: number | null,
  fxUsd: number | null,
): { currency: CurrencyCode; rate: number } {
  if (currency === "EUR") return { currency: "EUR", rate: 1 };
  const raw = currency === "BRL" ? fxBrl : fxUsd;
  if (raw == null || !(raw > 0)) return { currency: "EUR", rate: 1 }; // sem cotação → mostra EUR
  return { currency, rate: raw };
}
