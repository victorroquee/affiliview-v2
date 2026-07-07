import React, { useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isAfter, isBefore, isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, Infinity as InfinityIcon } from "lucide-react";

interface Props {
  from: string; // ISO or ""
  to: string;   // ISO or ""
  onApply: (from: string, to: string) => void;
  onAll: () => void;
  onClose: () => void;
}

const isoOf = (d: Date) => format(d, "yyyy-MM-dd");
const parse = (s: string): Date | null => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00") : null);
const WD = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const DateRangePicker: React.FC<Props> = ({ from, to, onApply, onAll, onClose }) => {
  const initFrom = parse(from);
  const initTo = parse(to);
  const [start, setStart] = useState<Date | null>(initFrom);
  const [end, setEnd] = useState<Date | null>(initTo);
  const [view, setView] = useState<Date>(startOfMonth(initTo ?? initFrom ?? new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(view), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(view), { weekStartsOn: 1 }),
  });

  const pick = (d: Date) => {
    if (!start || (start && end)) { setStart(d); setEnd(null); return; }
    if (isBefore(d, start)) { setStart(d); return; }
    setEnd(d);
  };

  const inRange = (d: Date) => start && end && isAfter(d, start) && isBefore(d, end);
  const isEdge = (d: Date) => (start && isSameDay(d, start)) || (end && isSameDay(d, end));

  return (
    <div className="drp" onClick={(e) => e.stopPropagation()}>
      <div className="drp-head">
        <button className="drp-nav" onClick={() => setView(subMonths(view, 1))}><ChevronLeft size={15} /></button>
        <span className="drp-month">{format(view, "MMMM yyyy")}</span>
        <button className="drp-nav" onClick={() => setView(addMonths(view, 1))}><ChevronRight size={15} /></button>
      </div>

      <div className="drp-grid drp-wd">{WD.map((w) => <span key={w} className="drp-wd-cell">{w}</span>)}</div>
      <div className="drp-grid">
        {days.map((d) => {
          const cls = [
            "drp-day",
            !isSameMonth(d, view) ? "muted" : "",
            isEdge(d) ? "edge" : "",
            inRange(d) ? "in" : "",
          ].filter(Boolean).join(" ");
          return (
            <button key={isoOf(d)} className={cls} onClick={() => pick(d)}>{d.getDate()}</button>
          );
        })}
      </div>

      <div className="drp-foot">
        <button className="drp-all" onClick={onAll}><InfinityIcon size={13} strokeWidth={1.8} /> Tudo (desde o início)</button>
        <div className="drp-foot-actions">
          <button className="drp-cancel" onClick={onClose}>Cancelar</button>
          <button className="drp-apply" disabled={!start || !end} onClick={() => start && end && onApply(isoOf(start), isoOf(end))}>Aplicar</button>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
