/**
 * Shared helpers for the qti-match-interaction modes. Pure functions — no
 * Lit, no DOM mutation, no reactivity. Both the tabular and drag-drop
 * controllers import from here.
 */

import { iterCorrectResponseValues, serializePair } from '../../../shared/correct-response/codec.js';

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

/**
 * Iterate "src tgt" entries from any correct-response shape:
 *  - canonical comma-joined string ("A B,C D,E F") — via shared codec
 *  - array form (["A B","C D","E F"]) — via shared codec
 *  - legacy JSON form (`'["A B", ...]'`) — local fallback below, kept for
 *    backwards compat with older PM docs
 * Each yielded entry is trimmed; blank entries are skipped.
 */
function* iterPairEntries(raw: string | string[] | null | undefined): Generator<string> {
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const t = typeof entry === 'string' ? entry.trim() : '';
          if (t) yield t;
        }
        return;
      }
    } catch {
      /* fall through to canonical parsing */
    }
  }
  yield* iterCorrectResponseValues(raw ?? null);
}

/** Parse the correct-response value into a Map<sourceId, targetId>. */
export function parseCorrectResponseAsAssociations(raw: string | string[] | null): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of iterPairEntries(raw)) {
    const [sourceId, targetId] = entry.split(/\s+/);
    if (sourceId && targetId) map.set(sourceId, targetId);
  }
  return map;
}

/** Parse the correct-response value into a Set of `"src tgt"` strings (tabular shape). */
export function parseCorrectResponseAsPairs(raw: string | string[] | null): Set<string> {
  const set = new Set<string>();
  for (const entry of iterPairEntries(raw)) set.add(entry);
  return set;
}

/**
 * Serialize a Map<src, tgt> to the canonical correct-response attribute value:
 * comma-joined `"src tgt"` entries (same convention as associate / order).
 * Returns null when empty so the schema can drop the attribute.
 */
export function serializeAssociations(associations: Map<string, string>): string | null {
  if (associations.size === 0) return null;
  return Array.from(associations, ([s, t]) => serializePair(s, t)).join(',');
}

/** Serialize an array of `"src tgt"` strings to the canonical comma-joined form. */
export function serializePairs(pairs: string[]): string | null {
  return pairs.length > 0 ? pairs.join(',') : null;
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
