import type { LanguageCode } from "../lib/settingsStore";
import { guidePt } from "./guide.pt";
import { guideEn } from "./guide.en";

export interface GuideEntry {
  id: string;
  /** Rótulo de categoria (já no idioma correspondente). */
  category: string;
  title: string;
  summary: string;
  /** Passos de "como é calculado". */
  how: string[];
  example?: string;
  /** Caminho do arquivo de lógica que documenta esse cálculo. */
  source?: string;
}

const GUIDE: Record<LanguageCode, GuideEntry[]> = {
  "pt-BR": guidePt,
  en: guideEn,
};

export function getGuide(lang: LanguageCode): GuideEntry[] {
  return GUIDE[lang] ?? guidePt;
}

/** Categorias na ordem de exibição, preservando a ordem das entradas. */
export function guideCategories(entries: GuideEntry[]): string[] {
  const seen: string[] = [];
  for (const e of entries) if (!seen.includes(e.category)) seen.push(e.category);
  return seen;
}
