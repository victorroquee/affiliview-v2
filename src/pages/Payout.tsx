import React, { useMemo, useState } from "react";
import { CalendarClock, PiggyBank, Hourglass, Wallet, BarChart2 } from "lucide-react";
import KPICard from "../components/KPICard";
import LoadingDot from "../components/LoadingDot";
import type { PayoutSchedule } from "../lib/payout";
import { formatEur } from "../lib/transactions";

interface Props {
  schedule: PayoutSchedule;
  loading: boolean;
}

const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const parseReal = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = parseFloat(s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};

const Payout: React.FC<Props> = ({ schedule, loading }) => {
  const [real, setReal] = useState<Record<string, string>>({});

  // Semanas mais recentes primeiro
  const weeks = useMemo(() => [...schedule.weeks].reverse(), [schedule.weeks]);

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

  return (
    <>
      <div className="section-header">
        <h2>Payout Semanal</h2>
        <span className="section-sub">
          D+14 (90%) · reserva 10% em D+60 · saque toda sexta · comparar com o valor real da Digistore
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
            info="10% de cada venda que a Digistore ainda retém (libera em D+60). Ainda não sacável."
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
            info="Soma de todos os payouts esperados no intervalo com dados."
          />
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Saques por semana (sexta)</h3>
          <p>Preencha a coluna "Real (Digistore)" para conferir o esperado centavo a centavo</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sexta</th>
              <th style={{ textAlign: "right" }}>Vendas</th>
              <th style={{ textAlign: "right" }}>90% liberado</th>
              <th style={{ textAlign: "right" }}>Reserva 10%</th>
              <th style={{ textAlign: "right" }}>Refunds</th>
              <th style={{ textAlign: "right" }}>Esperado</th>
              <th style={{ textAlign: "right" }}>Real (Digistore)</th>
              <th style={{ textAlign: "right" }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const r = parseReal(real[w.payoutDate] ?? "");
              const delta = r === null ? null : w.expectedPayout - r;
              const deltaColor = delta === null ? "" : Math.abs(delta) < 0.01 ? "green" : Math.abs(delta) < 1 ? "yellow" : "red";
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
                      value={real[w.payoutDate] ?? ""}
                      onChange={(e) => setReal((prev) => ({ ...prev, [w.payoutDate]: e.target.value }))}
                    />
                  </td>
                  <td className={`num ${deltaColor}`} style={{ fontWeight: 600 }}>
                    {delta === null ? "—" : formatEur(delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
