import { describe, it, expect, beforeEach, vi } from "vitest";
import { serializeRows, deserializeRows, readRowsCache, writeRowsCache, windowKey } from "./rowsCache";
import type { TransactionRow } from "./transactions";

// Node 25 injeta um localStorage experimental quebrado (sem --localstorage-file) que
// sombreia o do jsdom → stub in-memory determinístico para os testes.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
});

const mkRow = (o: Partial<TransactionRow>): TransactionRow => ({
  date: new Date("2026-05-04T10:00:00Z"), orderId: "O", buyerId: "B", transactionType: "payment",
  grossAmount: 1, netAmount: 1, earnings: 1, affiliate: "a", productName: "Slimjara", productGroup: "",
  country: "DE", quantity: 1, upsellNo: 0, affiliateAmount: 0, vatAmount: 0, productId: "", ...o,
});

beforeEach(() => localStorage.clear());

describe("rowsCache", () => {
  it("CACHE-01: serialize/deserialize preserva Date e campos", () => {
    const rows = [mkRow({ orderId: "X", grossAmount: 42 })];
    const back = deserializeRows(serializeRows(rows));
    expect(back[0]!.date instanceof Date).toBe(true);
    expect(back[0]!.date.getTime()).toBe(rows[0]!.date.getTime());
    expect(back[0]!.orderId).toBe("X");
    expect(back[0]!.grossAmount).toBe(42);
  });

  it("CACHE-02: write depois read por janela devolve as rows (datas como Date)", () => {
    const k = windowKey("-30d", "now");
    writeRowsCache(k, [mkRow({ orderId: "A" })], 1000);
    const got = readRowsCache(k);
    expect(got).not.toBeNull();
    expect(got!.rows[0]!.orderId).toBe("A");
    expect(got!.rows[0]!.date instanceof Date).toBe(true);
    expect(got!.fetchedAt).toBe(1000);
  });

  it("CACHE-03: janela inexistente → null", () => {
    expect(readRowsCache("nope")).toBeNull();
  });

  it("CACHE-04: LRU mantém apenas as janelas mais novas", () => {
    for (let i = 0; i < 8; i++) writeRowsCache(windowKey("w" + i, "now"), [mkRow({})], i);
    // MAX_WINDOWS = 6 → as 2 mais antigas (w0, w1) somem
    expect(readRowsCache(windowKey("w0", "now"))).toBeNull();
    expect(readRowsCache(windowKey("w1", "now"))).toBeNull();
    expect(readRowsCache(windowKey("w7", "now"))).not.toBeNull();
    expect(readRowsCache(windowKey("w2", "now"))).not.toBeNull();
  });
});
