import type { TransactionRow } from "./transactions";

// Cache de transações em localStorage para instant-load (stale-while-revalidate).
// Padrão quota-safe: try/catch em toda I/O; LRU por janela de busca.
const LS_KEY = "affiliview-rows-cache-v1";
const MAX_WINDOWS = 6;

type SerRow = Omit<TransactionRow, "date" | "timestamp"> & { date: string; timestamp?: string };
interface CacheEntry { rows: SerRow[]; fetchedAt: number; }
type CacheMap = Record<string, CacheEntry>;

/** Chave de cache = par (from,to) da busca na API. */
export function windowKey(from: string, to: string): string {
  return `${from}|${to}`;
}

export function serializeRows(rows: TransactionRow[]): SerRow[] {
  return rows.map((r) => ({ ...r, date: r.date.toISOString(), timestamp: r.timestamp?.toISOString() }));
}

export function deserializeRows(ser: SerRow[]): TransactionRow[] {
  return ser.map((r) => ({ ...r, date: new Date(r.date), timestamp: r.timestamp ? new Date(r.timestamp) : undefined }));
}

function readMap(): CacheMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: CacheMap): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false; // quota ou storage indisponível
  }
}

export function readRowsCache(key: string): { rows: TransactionRow[]; fetchedAt: number } | null {
  const e = readMap()[key];
  if (!e) return null;
  return { rows: deserializeRows(e.rows), fetchedAt: e.fetchedAt };
}

/** Grava a janela e aplica LRU. Em erro de quota, descarta as mais antigas e tenta de novo. */
export function writeRowsCache(key: string, rows: TransactionRow[], now: number): void {
  const map = readMap();
  map[key] = { rows: serializeRows(rows), fetchedAt: now };

  const trimOldest = (keep: number) => {
    const keys = Object.keys(map).sort((a, b) => map[a]!.fetchedAt - map[b]!.fetchedAt); // antigas primeiro
    for (const k of keys.slice(0, Math.max(0, keys.length - keep))) delete map[k];
  };

  trimOldest(MAX_WINDOWS);
  if (!writeMap(map)) {
    // Quota estourou mesmo dentro do limite de janelas → reduz agressivamente e tenta 1x
    trimOldest(1);
    writeMap(map);
  }
}
