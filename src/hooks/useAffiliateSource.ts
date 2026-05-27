import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = "affiliview-affiliate-sources";

export interface AffiliateSourceDef {
  label: string;
  color: string;
  bg: string;
}

export const AFFILIATE_SOURCES: Record<string, AffiliateSourceDef> = {
  chris:          { label: "Chris",          color: "#1e40af", bg: "#dbeafe" },
  "cesar-faria":  { label: "Cesar Faria",   color: "#7c2d12", bg: "#fed7aa" },
  "pedro-andrade":{ label: "Pedro Andrade", color: "#166534", bg: "#bbf7d0" },
  alotamedia:     { label: "AlotaMedia",    color: "#7e22ce", bg: "#e9d5ff" },
};

export const SOURCE_KEYS = Object.keys(AFFILIATE_SOURCES);

// ─── Pure Helper Functions ──────────────────────────────────────────────────

function readSourcesFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeSourcesToStorage(sources: Record<string, string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(sources));
  } catch {
    // Silently ignore quota errors
  }
}

// ─── React Hook ─────────────────────────────────────────────────────────────

export function useAffiliateSource() {
  const [sources, setSources] = useState<Record<string, string>>(() => readSourcesFromStorage());

  function setSource(affiliateName: string, sourceKey: string): void {
    setSources((prev) => {
      const next = { ...prev, [affiliateName]: sourceKey };
      writeSourcesToStorage(next);
      return next;
    });
  }

  function removeSource(affiliateName: string): void {
    setSources((prev) => {
      const next = { ...prev };
      delete next[affiliateName];
      writeSourcesToStorage(next);
      return next;
    });
  }

  function getSourceFor(affiliateName: string): string | null {
    return sources[affiliateName] ?? null;
  }

  function getSourceDef(affiliateName: string): AffiliateSourceDef | null {
    const key = sources[affiliateName];
    if (!key) return null;
    return AFFILIATE_SOURCES[key] ?? null;
  }

  /** All source keys that are currently assigned to at least one affiliate */
  function activeSources(): string[] {
    const set = new Set(Object.values(sources));
    return SOURCE_KEYS.filter((k) => set.has(k));
  }

  return {
    sources,
    setSource,
    removeSource,
    getSourceFor,
    getSourceDef,
    activeSources,
  };
}
