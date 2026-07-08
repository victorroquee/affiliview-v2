import { describe, it, expect } from "vitest";
import { isStale } from "./fxService";

describe("fxService.isStale — regra de cache diário", () => {
  const now = new Date("2026-07-07T12:00:00Z").getTime();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

  it("nunca atualizado (null) → velho", () => {
    expect(isStale(null, now)).toBe(true);
  });
  it("data inválida → velho", () => {
    expect(isStale("not-a-date", now)).toBe(true);
  });
  it("há 2h → fresco", () => {
    expect(isStale(hoursAgo(2), now)).toBe(false);
  });
  it("há 25h → velho", () => {
    expect(isStale(hoursAgo(25), now)).toBe(true);
  });
});
