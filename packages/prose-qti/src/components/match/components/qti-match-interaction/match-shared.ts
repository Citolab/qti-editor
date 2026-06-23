/**
 * Shared helpers for the qti-match-interaction modes. Pure functions — no
 * Lit, no DOM mutation, no reactivity. Both the tabular and drag-drop
 * controllers import from here.
 */

/** Drag-drop mode pair: [sourceIdentifier, targetIdentifier]. */
export type MatchAssociation = [string, string];

export interface MatchAssociationChangeDetail {
  associations: MatchAssociation[];
}

/** Tabular mode pair: [sourceIdentifier, targetIdentifier]. */
export type TabularMatchAssociation = [string, string];

export interface TabularMatchAssociationChangeDetail {
  associations: TabularMatchAssociation[];
}

/** Parse `'["src tgt", ...]'` into a Map<sourceId, targetId>. */
export function parseCorrectResponseAsAssociations(raw: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (typeof entry !== 'string') continue;
        const [sourceId, targetId] = entry.split(' ');
        if (sourceId && targetId) map.set(sourceId, targetId);
      }
    }
  } catch {
    // Ignore malformed authoring JSON.
  }
  return map;
}

/** Parse `'["src tgt", ...]'` into a Set of `"src tgt"` strings (tabular shape). */
export function parseCorrectResponseAsPairs(raw: string | null): Set<string> {
  const set = new Set<string>();
  if (!raw) return set;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (typeof entry === 'string' && entry.trim()) set.add(entry.trim());
      }
    }
  } catch {
    // Ignore malformed authoring JSON.
  }
  return set;
}

/** Serialize a Map<src, tgt> back to `'["src tgt", ...]'` or null when empty. */
export function serializeAssociations(associations: Map<string, string>): string | null {
  if (associations.size === 0) return null;
  return JSON.stringify(Array.from(associations, ([s, t]) => `${s} ${t}`));
}

/** Serialize an array of `"src tgt"` strings, or null when empty. */
export function serializePairs(pairs: string[]): string | null {
  return pairs.length > 0 ? JSON.stringify(pairs) : null;
}

/** Returns the two direct-child match-sets of the host, in document order. */
export function getMatchSets(host: HTMLElement): [HTMLElement | null, HTMLElement | null] {
  const sets = host.querySelectorAll(':scope > qti-simple-match-set');
  return [
    (sets[0] as HTMLElement | undefined) ?? null,
    (sets[1] as HTMLElement | undefined) ?? null,
  ];
}

/** Returns the direct-child choices of a match-set, in document order. */
export function getChoices(matchSet: HTMLElement | null): HTMLElement[] {
  if (!matchSet) return [];
  return Array.from(matchSet.querySelectorAll(':scope > qti-simple-associable-choice'));
}

/** `qti-match-tabular` discriminator helper. */
export const TABULAR_CLASS = 'qti-match-tabular';

export function classHasTabular(classes: string | null | undefined): boolean {
  return (classes ?? '').split(/\s+/).includes(TABULAR_CLASS);
}
