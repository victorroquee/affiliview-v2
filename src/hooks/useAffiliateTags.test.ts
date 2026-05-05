import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

// Import the hook logic directly — we test the pure functions, not the React hook
import {
  readTagsFromStorage,
  writeTagsToStorage,
  addTagToMap,
  removeTagFromMap,
  getTagsFor,
  allTagsFromMap,
} from "./useAffiliateTags";

const LS_KEY = "affiliview-affiliate-tags";

describe("useAffiliateTags — localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Test 1: addTag stores tag and getTagsFor returns it
  it("addTag stores tag in map and getTagsFor returns it", () => {
    const initial: Record<string, string[]> = {};
    const updated = addTagToMap(initial, "affiliateName", "chris");
    expect(getTagsFor(updated, "affiliateName")).toEqual(["chris"]);
  });

  // Test 2: addTag same tag twice does not duplicate
  it("addTag same tag twice does not duplicate", () => {
    let map: Record<string, string[]> = {};
    map = addTagToMap(map, "affiliateName", "chris");
    map = addTagToMap(map, "affiliateName", "chris");
    expect(getTagsFor(map, "affiliateName")).toEqual(["chris"]);
  });

  // Test 3: removeTag removes tag
  it("removeTag removes tag, getTagsFor returns empty", () => {
    let map: Record<string, string[]> = {};
    map = addTagToMap(map, "affiliateName", "chris");
    map = removeTagFromMap(map, "affiliateName", "chris");
    expect(getTagsFor(map, "affiliateName")).toEqual([]);
  });

  // Test 4: addTag normalizes input — " Facebook " becomes "facebook"
  it("addTag normalizes input to lowercase and trimmed", () => {
    const map = addTagToMap({}, "affiliateName", " Facebook ");
    expect(getTagsFor(map, "affiliateName")).toEqual(["facebook"]);
  });

  // Test 5: allTags returns deduplicated set across all affiliates
  it("allTags returns deduplicated sorted array across all affiliates", () => {
    let map: Record<string, string[]> = {};
    map = addTagToMap(map, "affiliateA", "chris");
    map = addTagToMap(map, "affiliateB", "facebook");
    map = addTagToMap(map, "affiliateA", "facebook"); // "facebook" appears twice
    const all = allTagsFromMap(map);
    expect(all).toEqual(["chris", "facebook"]); // sorted, no duplicates
  });

  // Test 6: empty string or whitespace-only tag is rejected
  it("rejects empty string tag", () => {
    const map = addTagToMap({}, "affiliateName", "");
    expect(getTagsFor(map, "affiliateName")).toEqual([]);
  });

  it("rejects whitespace-only tag", () => {
    const map = addTagToMap({}, "affiliateName", "   ");
    expect(getTagsFor(map, "affiliateName")).toEqual([]);
  });

  // Test 7: state persists to localStorage under key "affiliview-affiliate-tags"
  it("writeTagsToStorage persists under correct key and readTagsFromStorage retrieves it", () => {
    const tags: Record<string, string[]> = { affiliateA: ["chris", "facebook"] };
    writeTagsToStorage(tags);
    const raw = localStorage.getItem(LS_KEY);
    expect(raw).not.toBeNull();
    const parsed = readTagsFromStorage();
    expect(parsed).toEqual(tags);
  });

  // Test 8: HARD-01 — writeTagsToStorage does not throw on QuotaExceededError
  it("writeTagsToStorage does not throw on QuotaExceededError", () => {
    const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    expect(() => writeTagsToStorage({ aff: ["tag1"] })).not.toThrow();

    setItemSpy.mockRestore();
  });
});
