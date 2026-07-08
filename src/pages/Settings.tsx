import React, { useMemo, useState, useRef } from "react";
import {
  User, Coins, Languages, RefreshCw, BookOpen, Check, AlertTriangle, Loader2, ChevronDown,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSettings } from "../hooks/useSettings";
import { CURRENCY_META, type CurrencyCode } from "../lib/settingsStore";
import { LANGUAGES } from "../i18n";
import { getGuide, guideCategories } from "../i18n/guide";

const CURRENCIES: CurrencyCode[] = ["EUR", "BRL", "USD"];

const Settings: React.FC = () => {
  const { session } = useAuth();
  const { settings, saving, saveError, fxUnavailable, t, update, refreshFx } = useSettings();

  // Inputs não-controlados: `defaultValue` + `key` refletem o valor salvo sem
  // precisar espelhar props em state via effect. Salvam no blur.
  const [refreshing, setRefreshing] = useState(false);
  const brlRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);

  const guide = useMemo(() => getGuide(settings.language), [settings.language]);
  const categories = useMemo(() => guideCategories(guide), [guide]);

  const locale = settings.language === "en" ? "en-US" : "pt-BR";
  const fxDate = settings.fxUpdatedAt
    ? new Date(settings.fxUpdatedAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })
    : null;

  const blurName = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim() || "OG Group";
    if (v !== settings.accountName) void update({ accountName: v });
  };
  const blurDisplay = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim() || "OG Group";
    if (v !== settings.displayName) void update({ displayName: v });
  };

  const setCurrency = (c: CurrencyCode) => { if (c !== settings.currency) void update({ currency: c }); };
  const setLanguage = (l: typeof settings.language) => { if (l !== settings.language) void update({ language: l }); };

  const doRefresh = async () => {
    setRefreshing(true);
    await refreshFx();
    setRefreshing(false);
  };

  const setManualMode = (manual: boolean) => {
    if (manual === settings.fxManual) return;
    if (manual) void update({ fxManual: true });
    else void doRefresh();
  };

  const blurManualRate = () => {
    if (!settings.fxManual) return; // inputs em modo automático são read-only
    const brl = parseFloat((brlRef.current?.value ?? "").replace(",", "."));
    const usd = parseFloat((usdRef.current?.value ?? "").replace(",", "."));
    void update({
      fxManual: true,
      fxBrl: Number.isFinite(brl) ? brl : settings.fxBrl,
      fxUsd: Number.isFinite(usd) ? usd : settings.fxUsd,
      fxUpdatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="settings-page">
      <div className="settings-head">
        <div>
          <h1 className="settings-title">{t("settings.title")}</h1>
          <p className="settings-subtitle">{t("settings.subtitle")}</p>
        </div>
        <div className="settings-savestate" role="status" aria-live="polite">
          {saving ? (
            <span className="settings-saving"><Loader2 size={13} className="spin" /> {t("settings.saving")}</span>
          ) : saveError ? (
            <span className="settings-savefail"><AlertTriangle size={13} /> {t("settings.saveError")}</span>
          ) : (
            <span className="settings-saved"><Check size={13} /> {t("settings.saved")}</span>
          )}
        </div>
      </div>

      {/* ── Conta ─────────────────────────────────────────────────────────── */}
      <section className="settings-card">
        <div className="settings-card-head">
          <User size={16} strokeWidth={1.7} />
          <div>
            <h2>{t("settings.account.title")}</h2>
            <p>{t("settings.account.desc")}</p>
          </div>
        </div>
        <div className="settings-fields">
          <label className="settings-field">
            <span className="settings-label">{t("settings.account.name")}</span>
            <input
              className="settings-input" type="text" maxLength={60}
              key={`acc-${settings.accountName}`} defaultValue={settings.accountName} onBlur={blurName}
            />
            <span className="settings-hint">{t("settings.account.nameHint")}</span>
          </label>
          <label className="settings-field">
            <span className="settings-label">{t("settings.account.displayName")}</span>
            <input
              className="settings-input" type="text" maxLength={60}
              key={`disp-${settings.displayName}`} defaultValue={settings.displayName} onBlur={blurDisplay}
            />
            <span className="settings-hint">{t("settings.account.displayNameHint")}</span>
          </label>
          <label className="settings-field">
            <span className="settings-label">{t("settings.account.email")}</span>
            <input className="settings-input" type="text" value={session?.user.email ?? ""} readOnly disabled />
          </label>
        </div>
      </section>

      {/* ── Preferências ──────────────────────────────────────────────────── */}
      <section className="settings-card">
        <div className="settings-card-head">
          <Coins size={16} strokeWidth={1.7} />
          <div>
            <h2>{t("settings.prefs.title")}</h2>
            <p>{t("settings.prefs.desc")}</p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="settings-field">
            <span className="settings-label">{t("settings.prefs.currency")}</span>
            <div className="settings-segment">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  className={`settings-seg-btn ${settings.currency === c ? "active" : ""}`}
                  onClick={() => setCurrency(c)}
                >
                  {CURRENCY_META[c].label}
                </button>
              ))}
            </div>
            <span className="settings-hint">{t("settings.prefs.currencyHint")}</span>
          </div>
          <div className="settings-field">
            <span className="settings-label"><Languages size={13} /> {t("settings.prefs.language")}</span>
            <div className="settings-segment">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`settings-seg-btn ${settings.language === l.code ? "active" : ""}`}
                  onClick={() => setLanguage(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span className="settings-hint">{t("settings.prefs.languageHint")}</span>
          </div>
        </div>
      </section>

      {/* ── Câmbio ────────────────────────────────────────────────────────── */}
      {settings.currency !== "EUR" ? (
        <section className="settings-card">
          <div className="settings-card-head">
            <RefreshCw size={16} strokeWidth={1.7} />
            <div>
              <h2>{t("settings.fx.title")}</h2>
              <p>{fxDate ? t("settings.fx.updated", { date: fxDate }) : t("settings.fx.never")}</p>
            </div>
          </div>

          {fxUnavailable && (
            <div className="settings-alert"><AlertTriangle size={14} /> {t("settings.fx.unavailable")}</div>
          )}

          <div className="settings-segment settings-segment--wide">
            <button className={`settings-seg-btn ${!settings.fxManual ? "active" : ""}`} onClick={() => setManualMode(false)}>
              {t("settings.fx.auto")}
            </button>
            <button className={`settings-seg-btn ${settings.fxManual ? "active" : ""}`} onClick={() => setManualMode(true)}>
              {t("settings.fx.manual")}
            </button>
          </div>

          <div className="settings-fx-rates">
            <label className="settings-field">
              <span className="settings-label">{t("settings.fx.rateBrl")}</span>
              <input
                ref={brlRef} className="settings-input" type="text" inputMode="decimal"
                key={`brl-${settings.fxManual}-${settings.fxBrl ?? "x"}`}
                defaultValue={settings.fxManual ? (settings.fxBrl?.toString() ?? "") : (settings.fxBrl?.toFixed(4) ?? "—")}
                onBlur={blurManualRate} readOnly={!settings.fxManual}
              />
            </label>
            <label className="settings-field">
              <span className="settings-label">{t("settings.fx.rateUsd")}</span>
              <input
                ref={usdRef} className="settings-input" type="text" inputMode="decimal"
                key={`usd-${settings.fxManual}-${settings.fxUsd ?? "x"}`}
                defaultValue={settings.fxManual ? (settings.fxUsd?.toString() ?? "") : (settings.fxUsd?.toFixed(4) ?? "—")}
                onBlur={blurManualRate} readOnly={!settings.fxManual}
              />
            </label>
            {!settings.fxManual && (
              <button className="settings-btn" onClick={doRefresh} disabled={refreshing}>
                <RefreshCw size={13} className={refreshing ? "spin" : ""} />
                {refreshing ? t("settings.fx.refreshing") : t("settings.fx.refresh")}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {/* ── Guia de Lógicas ───────────────────────────────────────────────── */}
      <section className="settings-card">
        <div className="settings-card-head">
          <BookOpen size={16} strokeWidth={1.7} />
          <div>
            <h2>{t("settings.guide.title")}</h2>
            <p>{t("settings.guide.desc")}</p>
          </div>
        </div>

        {categories.map((cat) => (
          <div className="settings-guide-cat" key={cat}>
            <div className="settings-guide-cat-label">{cat}</div>
            {guide.filter((e) => e.category === cat).map((entry) => (
              <details className="settings-guide-entry" key={entry.id}>
                <summary>
                  <span className="settings-guide-entry-title">{entry.title}</span>
                  <span className="settings-guide-entry-summary">{entry.summary}</span>
                  <ChevronDown size={15} className="settings-guide-chevron" />
                </summary>
                <div className="settings-guide-body">
                  <div className="settings-guide-how-label">{t("settings.guide.how")}</div>
                  <ul className="settings-guide-how">
                    {entry.how.map((step, i) => <li key={i}>{step}</li>)}
                  </ul>
                  {entry.example && (
                    <p className="settings-guide-example"><b>{t("settings.guide.example")}:</b> {entry.example}</p>
                  )}
                  {entry.source && (
                    <p className="settings-guide-source">{t("settings.guide.source")}: <code>{entry.source}</code></p>
                  )}
                </div>
              </details>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
};

export default Settings;
