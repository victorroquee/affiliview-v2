import React, { useEffect, useState } from "react";
import { Clock, CalendarClock, PiggyBank, Hourglass, ChevronRight } from "lucide-react";
import { formatEur } from "../lib/transactions";

interface Props {
  nextPayoutDate: string | null; // "YYYY-MM-DD" (sexta)
  nextPayoutAmount: number;
  pendingReserve: number;
  pendingClearing: number;
  onOpenPayout: () => void;
}

/** Relógio ao vivo + widget de payout (clicável → aba Payout; hover mostra mais infos). */
const HeaderClock: React.FC<Props> = ({
  nextPayoutDate, nextPayoutAmount, pendingReserve, pendingClearing, onOpenPayout,
}) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("pt-BR", { hour12: false });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  let countdown = "—";
  if (nextPayoutDate) {
    const target = new Date(nextPayoutDate + "T00:00:00Z").getTime();
    const diff = target - now.getTime();
    if (diff <= 0) {
      countdown = "hoje";
    } else {
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      countdown = `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    }
  }

  return (
    <div className="header-widgets">
      <div className="hw-clock" title="Horário atual">
        <Clock size={13} strokeWidth={1.6} />
        <span className="hw-time">{timeStr}</span>
        <span className="hw-date">{dateStr}</span>
      </div>

      {/* Widget de payout: clicável + hover popover */}
      <div className="hw-payout-wrap">
        <button className="hw-payout" onClick={onOpenPayout} title="Abrir aba Payout">
          <CalendarClock size={13} strokeWidth={1.6} />
          <span className="hw-payout-label">Próx. payout</span>
          <span className="hw-payout-cd">{countdown}</span>
          <ChevronRight size={12} strokeWidth={2} className="hw-payout-arrow" />
        </button>

        <div className="hw-popover" role="tooltip">
          <div className="hw-pop-title">
            <CalendarClock size={13} strokeWidth={1.7} />
            Próximo payout {nextPayoutDate ? `· ${nextPayoutDate.slice(8, 10)}/${nextPayoutDate.slice(5, 7)}` : ""}
          </div>
          <div className="hw-pop-amount">{formatEur(nextPayoutAmount)}</div>
          <div className="hw-pop-row"><PiggyBank size={12} strokeWidth={1.7} /> Reserva retida <b>{formatEur(pendingReserve)}</b></div>
          <div className="hw-pop-row"><Hourglass size={12} strokeWidth={1.7} /> Em clearing (D+14) <b>{formatEur(pendingClearing)}</b></div>
          <div className="hw-pop-cta">Clique para ver o schedule completo <ChevronRight size={11} strokeWidth={2} /></div>
        </div>
      </div>
    </div>
  );
};

export default HeaderClock;
