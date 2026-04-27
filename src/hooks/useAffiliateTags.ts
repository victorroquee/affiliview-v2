import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = "affiliview-affiliate-tags";

// ─── Pure Helper Functions (exported for testing) ─────────────────────────────

export function readTagsFromStorage(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function writeTagsToStorage(tags: Record<string, string[]>): void {
  localStorage.setItem(LS_KEY, JSON.stringify(tags));
}

export function addTagToMap(
  map: Record<string, string[]>,
  affiliateName: string,
  tag: string
): Record<string, string[]> {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return map; // reject empty/whitespace-only
  const existing = map[affiliateName] ?? [];
  if (existing.includes(normalized)) return map; // reject duplicates
  return { ...map, [affiliateName]: [...existing, normalized] };
}

export function removeTagFromMap(
  map: Record<string, string[]>,
  affiliateName: string,
  tag: string
): Record<string, string[]> {
  const existing = map[affiliateName] ?? [];
  const updated = existing.filter((t) => t !== tag);
  return { ...map, [affiliateName]: updated };
}

export function getTagsFor(map: Record<string, string[]>, affiliateName: string): string[] {
  return map[affiliateName] ?? [];
}

export function allTagsFromMap(map: Record<string, string[]>): string[] {
  const set = new Set<string>();
  for (const tags of Object.values(map)) {
    for (const tag of tags) {
      set.add(tag);
    }
  }
  return Array.from(set).sort();
}

// ─── React Hook ───────────────────────────────────────────────────────────────

export function useAffiliateTags() {
  const [tags, setTags] = useState<Record<string, string[]>>(() => readTagsFromStorage());

  function addTag(affiliateName: string, tag: string): void {
    setTags((prev) => {
      const next = addTagToMap(prev, affiliateName, tag);
      writeTagsToStorage(next);
      return next;
    });
  }

  function removeTag(affiliateName: string, tag: string): void {
    setTags((prev) => {
      const next = removeTagFromMap(prev, affiliateName, tag);
      writeTagsToStorage(next);
      return next;
    });
  }

  return {
    tags,
    getTagsFor: (affiliateName: string) => getTagsFor(tags, affiliateName),
    addTag,
    removeTag,
    allTags: allTagsFromMap(tags),
  };
}
