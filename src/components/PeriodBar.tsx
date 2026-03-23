import React from "react";
import { X } from "lucide-react";
import {
  type PeriodFilter,
  type PresetKey,
  INITIAL_PERIOD,
  PRESET_LABELS,
} from "../hooks/useFilters";

interface PeriodBarProps {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  activeDateFrom: string;
  activeDateTo: string;
  totalRows: number;
  isDateRangeValid: boolean;
}

function formatDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseInputDate(val: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const parts = val.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return val;
}

const PeriodBar: React.FC<PeriodBarProps> = ({
  period,
  setPeriod,
  activeDateFrom,
  activeDateTo,
  totalRows,
  isDateRangeValid,
}) => {
  const handlePreset = (preset: PresetKey) => {
    setPeriod({ mode: "preset", preset, dateFrom: "", dateTo: "" });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = parseInputDate(e.target.value);
    setPeriod({
      mode:     "custom",
      dateFrom: iso,
      dateTo:   period.mode === "custom" ? period.dateTo : activeDateTo || "",
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = parseInputDate(e.target.value);
    setPeriod({
      mode:     "custom",
      dateFrom: period.mode === "custom" ? period.dateFrom : activeDateFrom || "",
      dateTo:   iso,
    });
  };

  const handleClear = () => setPeriod(INITIAL_PERIOD);

  const isCustomActive = period.mode === "custom";

  return (
    <div className="period-bar">
      {/* Preset buttons */}
      <div className="period-bar-presets">
        {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => (
          <button
            key={key}
            className={`period-btn ${
              period.mode === "preset" && period.preset === key ? "active" : ""
            }`}
            onClick={() => handlePreset(key)}
          >
            {PRESET_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Separator */}
      <span className="period-bar-sep" />

      {/* Custom date range */}
      <div className="period-bar-dates">
        <span className="period-bar-date-label">De</span>
        <input
          type="date"
          className={`period-date-input ${!isDateRangeValid ? "invalid" : ""}`}
          value={period.mode === "custom" ? period.dateFrom : ""}
          onChange={handleDateFromChange}
        />
        <span className="period-bar-date-label">até</span>
        <input
          type="date"
          className={`period-date-input ${!isDateRangeValid ? "invalid" : ""}`}
          value={period.mode === "custom" ? period.dateTo : ""}
          onChange={handleDateToChange}
        />
        {isCustomActive && (
          <button className="period-clear-btn" onClick={handleClear} title="Limpar filtro">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Active range indicator — inline */}
      {activeDateFrom && activeDateTo && (
        <>
          <span className="period-bar-sep" />
          <div className="period-bar-indicator">
            <span className="period-indicator-dot" />
            <span>{formatDisplay(activeDateFrom)} – {formatDisplay(activeDateTo)}</span>
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
