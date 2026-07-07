import React, { useState, useRef } from "react";
import { CalendarRange } from "lucide-react";
import {
  type PeriodFilter, type PresetKey, PRESET_LABELS, ALL_TIME_FROM,
} from "../hooks/useFilters";
import DateRangePicker from "./DateRangePicker";

interface PeriodBarProps {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  activeDateFrom: string;
  activeDateTo: string;
  totalRows: number;
  isDateRangeValid: boolean;
}

const fmt = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
const todayISO = () => new Date().toISOString().slice(0, 10);

const PeriodBar: React.FC<PeriodBarProps> = ({
  period, setPeriod, activeDateFrom, activeDateTo, totalRows, isDateRangeValid,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  const toggleOpen = () => {
    if (!open && pillRef.current) {
      const r = pillRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen((o) => !o);
  };

  const isCustom = period.mode === "custom";
  const isAll = isCustom && period.dateFrom === ALL_TIME_FROM;

  const pillLabel = !isCustom
    ? "Personalizado"
    : isAll
    ? "Tudo"
    : `${fmt(period.dateFrom)} – ${fmt(period.dateTo)}`;

  const handlePreset = (preset: PresetKey) => {
    setPeriod({ mode: "preset", preset, dateFrom: "", dateTo: "" });
  };
  const applyRange = (from: string, to: string) => {
    setPeriod({ mode: "custom", dateFrom: from, dateTo: to });
    setOpen(false);
  };
  const applyAll = () => {
    setPeriod({ mode: "custom", dateFrom: ALL_TIME_FROM, dateTo: todayISO() });
    setOpen(false);
  };

  return (
    <div className="period-bar">
      <div className="period-bar-presets">
        {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => (
          <button
            key={key}
            className={`period-btn ${period.mode === "preset" && period.preset === key ? "active" : ""}`}
            onClick={() => handlePreset(key)}
          >
            {PRESET_LABELS[key]}
          </button>
        ))}

        {/* Pill Personalizado + dropdown de calendário */}
        <div className="period-custom">
          <button ref={pillRef} className={`period-btn pill ${isCustom ? "active" : ""}`} onClick={toggleOpen}>
            <CalendarRange size={13} strokeWidth={1.7} />
            {pillLabel}
          </button>
          {open && pos && (
            <>
              <div className="drp-backdrop" onClick={() => setOpen(false)} />
              <div className="drp-dropdown" style={{ top: pos.top, left: pos.left }}>
                <DateRangePicker
                  from={isCustom && !isAll ? period.dateFrom : ""}
                  to={isCustom && !isAll ? period.dateTo : ""}
                  onApply={applyRange}
                  onAll={applyAll}
                  onClose={() => setOpen(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {activeDateFrom && activeDateTo && (
        <>
          <span className="period-bar-sep" />
          <div className="period-bar-indicator">
            <span className="period-indicator-dot" />
            <span>{isAll ? "Desde o início" : `${fmt(activeDateFrom)} – ${fmt(activeDateTo)}`}</span>
            <span className="period-indicator-count">· {totalRows.toLocaleString("de-DE")} transações</span>
          </div>
        </>
      )}

      {!isDateRangeValid && (
        <span className="period-bar-error">Data inicial deve ser anterior à data final</span>
      )}
    </div>
  );
};

export default PeriodBar;
