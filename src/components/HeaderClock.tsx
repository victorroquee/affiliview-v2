import React, { useEffect, useState } from "react";
import { Clock, CalendarClock } from "lucide-react";
import { formatEur } from "../lib/transactions";

interface Props {
  nextPayoutDate: string | null; // "YYYY-MM-DD" (sexta)
  nextPayoutAmount: number;
}

/** Relógio ao vivo + countdown para o próximo payout Digistore (sexta). */
const HeaderClock: React.FC<Props> = ({ nextPayoutDate, nextPayoutAmount }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("pt-BR", { hour12: false });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  let countdown = "—";
  if (nextPayoutDate) {
    // payout referenciado ao início da sexta (00:00 UTC) — aproximação para o countdown
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
      <div className="hw-payout" title={nextPayoutDate ? `Próximo payout: ${nextPayoutDate}` : "Sem payout previsto"}>
        <CalendarClock size={13} strokeWidth={1.6} />
        <span className="hw-payout-label">Próx. payout</span>
        <span className="hw-payout-cd">{countdown}</span>
        {nextPayoutAmount > 0 && <span className="hw-payout-amt">{formatEur(nextPayoutAmount)}</span>}
      </div>
    </div>
  );
};

export default HeaderClock;
