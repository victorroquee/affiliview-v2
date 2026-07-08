/* eslint-disable react-refresh/only-export-components -- provider + hook coabitam (padrão do useAuth) */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import {
  setMoneyState, resolveDisplayMoney,
  type CurrencyCode, type LanguageCode,
} from "../lib/settingsStore";
import { fetchFxRates, isStale } from "../lib/fxService";
import { createTranslator, type TFn } from "../i18n";

export interface AppSettings {
  accountName: string;
  displayName: string;
  currency: CurrencyCode;
  language: LanguageCode;
  fxBrl: number | null;
  fxUsd: number | null;
  fxManual: boolean;
  fxUpdatedAt: string | null;
}

const DEFAULTS: AppSettings = {
  accountName: "OG Group",
  displayName: "OG Group",
  currency: "EUR",
  language: "pt-BR",
  fxBrl: null,
  fxUsd: null,
  fxManual: false,
  fxUpdatedAt: null,
};

// Linha entregue pelo Supabase (snake_case).
interface SettingsRow {
  account_name: string;
  display_name: string;
  currency: CurrencyCode;
  language: LanguageCode;
  fx_brl: number | null;
  fx_usd: number | null;
  fx_manual: boolean;
  fx_updated_at: string | null;
}

function rowToSettings(r: SettingsRow): AppSettings {
  return {
    accountName: r.account_name ?? DEFAULTS.accountName,
    displayName: r.display_name ?? DEFAULTS.displayName,
    currency: r.currency ?? DEFAULTS.currency,
    language: r.language ?? DEFAULTS.language,
    fxBrl: r.fx_brl,
    fxUsd: r.fx_usd,
    fxManual: r.fx_manual ?? false,
    fxUpdatedAt: r.fx_updated_at,
  };
}

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  saving: boolean;
  saveError: string | null;
  fxUnavailable: boolean;
  t: TFn;
  /** Atualiza uma ou mais preferências e persiste no Supabase (otimista). */
  update: (patch: Partial<AppSettings>) => Promise<void>;
  /** Força uma nova busca de cotação (modo automático). */
  refreshFx: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/** Espelha moeda/idioma/taxa no singleton lido pelos formatadores. */
function syncStore(s: AppSettings): void {
  const { currency, rate } = resolveDisplayMoney(s.currency, s.fxBrl, s.fxUsd);
  setMoneyState({ currency, language: s.language, rate });
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fxUnavailable, setFxUnavailable] = useState(false);
  const fxTriedRef = useRef(false);

  // Aplica no estado local + espelha no store, numa tacada.
  const applyLocal = useCallback((next: AppSettings) => {
    setSettings(next);
    syncStore(next);
  }, []);

  // Persiste no Supabase (upsert na linha única — cria se a linha singleton sumir,
  // em vez de um UPDATE que casa 0 linhas e "salva" no vazio silenciosamente).
  const persist = useCallback(async (next: AppSettings) => {
    const { error } = await supabase.from("app_settings").upsert({
      id: "singleton",
      account_name: next.accountName,
      display_name: next.displayName,
      currency: next.currency,
      language: next.language,
      fx_brl: next.fxBrl,
      fx_usd: next.fxUsd,
      fx_manual: next.fxManual,
      fx_updated_at: next.fxUpdatedAt,
    });
    if (error) throw new Error(error.message);
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const prev = settings;
    const next = { ...prev, ...patch };
    applyLocal(next);           // otimista
    setSaving(true);
    setSaveError(null);
    try {
      await persist(next);
    } catch (e) {
      applyLocal(prev);         // reverte
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [settings, applyLocal, persist]);

  const refreshFx = useCallback(async () => {
    try {
      const { brl, usd } = await fetchFxRates();
      setFxUnavailable(false);
      const nowIso = new Date().toISOString();
      const next = { ...settings, fxBrl: brl, fxUsd: usd, fxUpdatedAt: nowIso, fxManual: false };
      applyLocal(next);
      await persist(next);
    } catch {
      setFxUnavailable(true);
    }
  }, [settings, applyLocal, persist]);

  // Carrega a linha de settings assim que houver sessão.
  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", "singleton")
        .maybeSingle();
      if (!active) return;
      const loaded = data && !error ? rowToSettings(data as SettingsRow) : DEFAULTS;
      applyLocal(loaded);
      setLoading(false);

      // Auto-atualiza a cotação se estiver no modo automático e estiver velha.
      if (!fxTriedRef.current && !loaded.fxManual && isStale(loaded.fxUpdatedAt)) {
        fxTriedRef.current = true;
        try {
          const { brl, usd } = await fetchFxRates();
          if (!active) return;
          const nowIso = new Date().toISOString();
          const next = { ...loaded, fxBrl: brl, fxUsd: usd, fxUpdatedAt: nowIso };
          applyLocal(next);
          await persist(next);
        } catch {
          if (active) setFxUnavailable(true);
        }
      }
    })();
    return () => { active = false; };
  }, [session, applyLocal, persist]);

  const t = useMemo<TFn>(() => createTranslator(settings.language), [settings.language]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings, loading, saving, saveError, fxUnavailable, t, update, refreshFx,
  }), [settings, loading, saving, saveError, fxUnavailable, t, update, refreshFx]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings deve ser usado dentro de <SettingsProvider>");
  return ctx;
}
