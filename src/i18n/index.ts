import { pt } from "./pt";
import { en } from "./en";
import type { LanguageCode } from "../lib/settingsStore";

export type { LanguageCode };

const DICTS: Record<LanguageCode, Record<string, string>> = {
  "pt-BR": pt,
  en,
};

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "pt-BR", label: "Português (BR)" },
  { code: "en", label: "English" },
];

export type TFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * Cria um tradutor para o idioma dado. Ordem de fallback:
 * idioma → PT (base) → a própria chave (nunca retorna vazio).
 */
export function createTranslator(lang: LanguageCode): TFn {
  const dict = DICTS[lang] ?? pt;
  return (key, params) => {
    let s = dict[key] ?? pt[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.split(`{${k}}`).join(String(v));
      }
    }
    return s;
  };
}
