import React, { useMemo, useState } from "react";
import { CalendarClock, PiggyBank, Hourglass, Wallet, BarChart2, AlertTriangle } from "lucide-react";
import KPICard from "../components/KPICard";
import LoadingDot from "../components/LoadingDot";
import type { PayoutSchedule, PayoutAnomaly } from "../lib/payout";
import { computeTransferAmount, classifyPayoutAnomaly, SEPA_FEE } from "../lib/payout";
import { formatEur } from "../lib/transactions";
import { usePayoutReconciliation } from "../hooks/usePayoutReconciliation";
import { useSettings } from "../hooks/useSettings";

interface Props {
  schedule: PayoutSchedule;
  loading: boolean;
}

const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// Parser tolerante a formato: aceita "50.357,93" (europeu), "50357,93" e "50357.93".
function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  let x = t.replace(/[^\d,.-]/g, "");
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(x)) x = x.replace(/\./g, "").replace(",", "."); // 1.234,56
  else if (/^-?\d+,\d+$/.test(x)) x = x.replace(",", ".");                                     // 294,50
  const n = parseFloat(x);
  return isNaN(n) ? null : n;
}

// Número → string do input, no separador decimal do idioma, sem separador de milhar.
function numToStr(n: number | null | undefined, language: string): string {
  if (n === null || n === undefined) return "";
  return new Intl.NumberFormat(language, { useGrouping: false, maximumFractionDigits: 2 }).format(n);
}

const ANOMALY_META: Record<Exclude<PayoutAnomaly, "none">, { cls: string; label: string }> = {
  ok:       { cls: "scale",     label: "ok" },
  watch:    { cls: "watch",     label: "observar" },
  critical: { cls: "probation", label: "anomalia" },
  skipped:  { cls: "probation", label: "pulado" },
};

const Payout: React.FC<Props> = ({ schedule, loading }) => {
  const { settings } = useSettings();
  const recon = usePayoutReconciliation();
  // Rascunho local dos inputs (digitação fluida); persiste no blur.
  const [realDraft, setRealDraft] = useState<Record<string, string>>({});
  const [shipDraft, setShipDraft] = useState<Record<string, string>>({});

  // Semanas mais recentes primeiro
  const weeks = useMemo(() => [...schedule.weeks].reverse(), [schedule.weeks]);

  // Contagem de anomalias graves (crítico/pulado) com Real preenchido → banner de alerta.
  const anomalyCount = useMemo(() => weeks.filter((w) => {
    const rn = recon.data[w.payoutDate]?.realNet ?? null;
    const lv = classifyPayoutAnomaly(w.expectedPayout, rn).level;
    return lv === "critical" || lv === "skipped";
  }).length, [weeks, recon.data]);

  // Totais para a linha de rodapé (Real/ShipOffers/Transfer só onde preenchido).
  const totals = useMemo(() => {
    let expected = 0, real = 0, ship = 0, transfer = 0;
    for (const w of weeks) {
      expected += w.expectedPayout;
      const e = recon.data[w.payoutDate];
      if (e?.realNet != null) real += e.realNet;
      if (e?.shipOffers != null) {
        ship += e.shipOffers;
        transfer += (computeTransferAmount(w.expectedPayout, e.shipOffers) ?? 0);
      }
    }
    return { expected, real, ship, transfer };
  }, [weeks, recon.data]);

  if (weeks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon-row">
          <BarChart2 size={36} strokeWidth={1.4} />
          {loading && <LoadingDot />}
        </div>
        <h3>{loading ? "Calculando payouts..." : "Sem dados de payout"}</h3>
        <p>
          {loading
            ? "Aguarde enquanto o schedule é calculado a partir das transações."
            : "Carregue transações da Digistore24 para projetar os saques semanais."}
        </p>
      </div>
    );
  }

  const lang = settings.language;

  return (
    <>
      <div className="section-header">
        <h2>Payout & Reconciliação</h2>
        <span className="section-sub">
          D+14 (90%) · reserva 10% em D+60 · saque toda sexta · Transfer = Net − ShipOffers − SEPA €{numToStr(SEPA_FEE, lang)}
        </span>
      </div>

      <div className="kpi-group">
        <div className="kpi-grid">
          <KPICard
            icon={CalendarClock}
            label="Próximo Payout"
            value={formatEur(schedule.nextPayoutAmount)}
            info={schedule.nextPayoutDate ? `Sexta ${fmt(schedule.nextPayoutDate)}. Soma o que libera até essa data (90% em D+14, reserva em D+60), menos refunds.` : "Sem próxima sexta prevista."}
            color="green"
          />
          <KPICard
            icon={PiggyBank}
            label="Reserva Retida"
            value={formatEur(schedule.pendingReserve)}
            info="10% de cada venda com vendor_share positivo que a Digistore ainda retém (libera em D+60). Ainda não sacável."
          />
          <KPICard
            icon={Hourglass}
            label="Em Clearing (D+14)"
            value={formatEur(schedule.pendingClearing)}
            info="90% de vendas recentes ainda dentro da janela de 14 dias — libera nas próximas sextas."
          />
          <KPICard
            icon={Wallet}
            label="Total Projetado"
            value={formatEur(schedule.totalExpected)}
            info="Soma de todos os payouts esperados (Net Amount) no intervalo com dados."
          />
        </div>
      </div>

      {anomalyCount > 0 && (
        <div className="payout-alert">
          <AlertTriangle size={16} strokeWidth={2} />
          <span>
            <strong>{anomalyCount}</strong> semana(s) com payout anômalo (recebido &lt; 50% do esperado ou zerado).
            Investigar reserva pendente, refunds tardios ou payout pulado na Digistore.
          </span>
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <h3>Saques por semana (sexta)</h3>
          <p>Preencha "Real (Net)" e "ShipOffers" (valores em EUR) para conferir o Transfer e detectar anomalias{recon.saveError ? ` — erro ao salvar: ${recon.saveError}` : ""}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sexta</th>
              <th style={{ textAlign: "right" }}>Vendas</th>
              <th style={{ textAlign: "right" }}>90% liberado</th>
              <th style={{ textAlign: "right" }}>Reserva 10%</th>
              <th style={{ textAlign: "right" }}>Refunds</th>
              <th style={{ textAlign: "right" }}>Esperado (Net)</th>
              <th style={{ textAlign: "right" }}>Real (Net)</th>
              <th style={{ textAlign: "right" }}>Δ Net</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "right" }}>ShipOffers</th>
              <th style={{ textAlign: "right" }}>Transfer (est.)</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const entry = recon.data[w.payoutDate];
              const realNet = entry?.realNet ?? null;
              const ship = entry?.shipOffers ?? null;
              const delta = realNet === null ? null : w.expectedPayout - realNet;
              const deltaColor = delta === null ? "" : Math.abs(delta) < 0.01 ? "green" : Math.abs(delta) < 1 ? "yellow" : "red";
              const anomaly = classifyPayoutAnomaly(w.expectedPayout, realNet);
              const meta = anomaly.level === "none" ? null : ANOMALY_META[anomaly.level];
              const transfer = computeTransferAmount(w.expectedPayout, ship);
              return (
                <tr key={w.payoutDate}>
                  <td style={{ fontWeight: 600 }}>{fmt(w.payoutDate)}</td>
                  <td className="num">{w.salesCleared}</td>
                  <td className="num">{formatEur(w.cleared)}</td>
                  <td className="num">{formatEur(w.reserveReleased)}</td>
                  <td className="num" style={{ color: w.refunds < 0 ? "var(--red)" : undefined }}>{formatEur(w.refunds)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatEur(w.expectedPayout)}</td>
                  <td className="num">
                    <input
                      className="payout-real-input"
                      inputMode="decimal"
                      placeholder="—"
                      value={realDraft[w.payoutDate] ?? numToStr(realNet, lang)}
                      onChange={(e) => setRealDraft((p) => ({ ...p, [w.payoutDate]: e.target.value }))}
                      onBlur={() => {
                        void recon.save(w.payoutDate, { realNet: parseNum(realDraft[w.payoutDate] ?? "") });
                        setRealDraft((p) => { const rest = { ...p }; delete rest[w.payoutDate]; return rest; });
                      }}
                    />
                  </td>
                  <td className={`num ${deltaColor}`} style={{ fontWeight: 600 }}>
                    {delta === null ? "—" : formatEur(delta)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {meta
                      ? <span className={`status-badge ${meta.cls}`} title={anomaly.ratio != null ? `Recebido ${(anomaly.ratio * 100).toFixed(0)}% do esperado` : undefined}>{meta.label}</span>
                      : <span className="num" style={{ color: "var(--text-3)" }}>—</span>}
                  </td>
                  <td className="num">
                    <input
                      className="payout-real-input"
                      inputMode="decimal"
                      placeholder="—"
                      value={shipDraft[w.payoutDate] ?? numToStr(ship, lang)}
                      onChange={(e) => setShipDraft((p) => ({ ...p, [w.payoutDate]: e.target.value }))}
                      onBlur={() => {
                        void recon.save(w.payoutDate, { shipOffers: parseNum(shipDraft[w.payoutDate] ?? "") });
                        setShipDraft((p) => { const rest = { ...p }; delete rest[w.payoutDate]; return rest; });
                      }}
                    />
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {transfer === null ? "—" : formatEur(transfer)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total-row">
              <td style={{ fontWeight: 700 }}>Total</td>
              <td></td><td></td><td></td><td></td>
              <td className="num" style={{ fontWeight: 700 }}>{formatEur(totals.expected)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{totals.real ? formatEur(totals.real) : "—"}</td>
              <td></td><td></td>
              <td className="num" style={{ fontWeight: 700 }}>{totals.ship ? formatEur(totals.ship) : "—"}</td>
              <td className="num" style={{ fontWeight: 700 }}>{totals.ship ? formatEur(totals.transfer) : "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="payout-note">
        <strong>Transfer (est.)</strong> = Esperado (Net) − invoice ShipOffers da semana − SEPA €{numToStr(SEPA_FEE, lang)}.
        Os valores manuais (Real e ShipOffers) são salvos automaticamente e ficam por sexta de saque.
      </p>

      {schedule.skippedFridays.length > 0 && (
        <p className="payout-note">
          Sextas puladas pelo limite de 4 saques/mês (rolaram para a próxima):{" "}
          {schedule.skippedFridays.map(fmt).join(" · ")}
        </p>
      )}
    </>
  );
};

export default Payout;
