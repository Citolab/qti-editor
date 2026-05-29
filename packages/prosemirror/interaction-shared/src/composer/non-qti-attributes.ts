/**
 * Unified, pure-function helpers for non-QTI attribute handling.
 *
 * Single source of truth derived from each interaction's
 * `InteractionComposerMetadata.nonQtiAttributes`. Lives in `interaction-shared`
 * so per-interaction `.compose.ts` files can call these helpers without taking
 * a circular dependency on `@qti-editor/qti-core` (which depends on the
 * interaction packages). `@qti-editor/qti-core/composer` re-exports these
 * helpers verbatim.
 *
 * No side effects and no I/O.
 */

import type { InteractionComposerMetadata, NonQtiAttribute } from '@qti-editor/interfaces';

export interface NonQtiAttributeEntry {
  /** Canonical attribute name on the source element. */
  source: string;
  /** `data-*` target, or `null` for strip-only entries. */
  mirror: string | null;
  /** Additional source names that mirror to the same target. */
  aliases: readonly string[];
}

const EMPTY_ALIASES: readonly string[] = Object.freeze([]);

/**
 * Normalize one declaration (string or object) into a uniform shape.
 *
 * Derivation rules:
 * - String `'foo'` → `{ source: 'foo', mirror: 'data-foo', aliases: [] }`.
 * - `{ source, mirror: false }` → `mirror: null` (strip-only).
 * - `{ source, mirror: 'data-bar' }` → preserved verbatim.
 * - `{ source }` with omitted `mirror` → `mirror: 'data-' + source`
 *   (no case folding; canonical sources today are all lowercase-hyphenated).
 */
export function normalizeNonQtiAttribute(entry: NonQtiAttribute): NonQtiAttributeEntry {
  if (typeof entry === 'string') {
    return { source: entry, mirror: `data-${entry}`, aliases: EMPTY_ALIASES };
  }
  const source = entry.source;
  let mirror: string | null;
  if (entry.mirror === false) {
    mirror = null;
  } else if (typeof entry.mirror === 'string') {
    mirror = entry.mirror;
  } else {
    mirror = `data-${source}`;
  }
  const aliases = entry.aliases && entry.aliases.length > 0 ? entry.aliases : EMPTY_ALIASES;
  return { source, mirror, aliases };
}

/**
 * Flat list of `{ source, target }` mirror tuples for one interaction's
 * metadata. Each entry contributes one tuple for its canonical source plus
 * one per alias, all targeting the same `target`. Strip-only entries
 * (`mirror === null`) are excluded.
 */
export function collectMirrorMappings(
  metadata: Pick<InteractionComposerMetadata, 'nonQtiAttributes'>,
): ReadonlyArray<{ source: string; target: string }> {
  const out: Array<{ source: string; target: string }> = [];
  for (const raw of metadata.nonQtiAttributes) {
    const entry = normalizeNonQtiAttribute(raw);
    if (entry.mirror === null) continue;
    out.push({ source: entry.source, target: entry.mirror });
    for (const alias of entry.aliases) {
      out.push({ source: alias, target: entry.mirror });
    }
  }
  return out;
}

/**
 * Remove the canonical source attribute (NOT aliases) for every entry in the
 * metadata. Strip-only entries are included. Aliases are intentionally NOT
 * stripped — that matches today's behavior captured in the Phase 1 snapshot
 * (camelCase variants survive on the source element).
 */
export function stripNonQtiAttributesFromElement(
  element: Element,
  metadata: Pick<InteractionComposerMetadata, 'nonQtiAttributes'>,
): void {
  for (const raw of metadata.nonQtiAttributes) {
    const entry = normalizeNonQtiAttribute(raw);
    element.removeAttribute(entry.source);
  }
}

/**
 * Copy values from `sourceElement` to `targetElement` following the mirror
 * tuples implied by the metadata.
 *
 * For each non-strip entry:
 * - Try the canonical source first; fall back to each alias in declaration
 *   order. First non-empty value wins.
 * - The destination attribute is always the canonical mirror target.
 * - Skip if the target attribute already exists on `targetElement`.
 * - Skip if no source carries a non-empty value.
 *
 * Strip-only entries (`mirror === null`) are no-ops here.
 */
export function copyMirrorsToTarget(
  sourceElement: Element,
  targetElement: Element,
  metadata: Pick<InteractionComposerMetadata, 'nonQtiAttributes'>,
): void {
  for (const raw of metadata.nonQtiAttributes) {
    const entry = normalizeNonQtiAttribute(raw);
    if (entry.mirror === null) continue;
    if (targetElement.hasAttribute(entry.mirror)) continue;
    const candidates = [entry.source, ...entry.aliases];
    for (const candidate of candidates) {
      const value = sourceElement.getAttribute(candidate);
      if (value !== null && value !== '') {
        targetElement.setAttribute(entry.mirror, value);
        break;
      }
    }
  }
}

/**
 * Aggregate every `{ source, target }` mirror tuple from all registered
 * interactions. Used by the importer to derive the inverse `data-*` → canonical
 * mapping. Duplicate `(source, target)` tuples are de-duplicated so that
 * universally-shared mirrors (e.g. `correct-response` declared per
 * interaction) only appear once.
 */
export function getAllMirrorTargets(
  registry: ReadonlyMap<string, InteractionComposerMetadata>,
): ReadonlyArray<{ source: string; target: string }> {
  const seen = new Set<string>();
  const out: Array<{ source: string; target: string }> = [];
  for (const metadata of registry.values()) {
    for (const tuple of collectMirrorMappings(metadata)) {
      const key = `${tuple.source} ${tuple.target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tuple);
    }
  }
  return out;
}
