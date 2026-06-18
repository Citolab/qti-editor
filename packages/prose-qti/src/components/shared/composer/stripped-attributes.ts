/**
 * Unified, pure-function helpers for stripped attribute handling.
 *
 * Single source of truth derived from each interaction's
 * `InteractionComposerMetadata.strippedAttributes`. Lives in `interaction-shared`
 * so per-interaction `.compose.ts` files can call these helpers without taking
 * a circular dependency on `@qti-editor/qti-core` (which depends on the
 * interaction packages). `@qti-editor/qti-core/composer` re-exports these
 * helpers verbatim.
 *
 * No side effects and no I/O.
 */

import type { InteractionComposerMetadata, StrippedAttribute } from '@citolab/prose-qti/interfaces';

export interface StrippedAttributeEntry {
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
export function normalizeStrippedAttribute(entry: StrippedAttribute): StrippedAttributeEntry {
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
 * Flat list of canonical source attribute names for one interaction's
 * metadata, including any declared aliases. This is the set of authoring
 * attributes the compose pipeline reads off the source element before
 * stripping them from the emitted standard-QTI interaction.
 */
export function getStrippedAttributeSources(
  metadata: Pick<InteractionComposerMetadata, 'strippedAttributes'>,
): string[] {
  const out: string[] = [];
  for (const raw of metadata.strippedAttributes) {
    const entry = normalizeStrippedAttribute(raw);
    out.push(entry.source);
    for (const alias of entry.aliases) {
      out.push(alias);
    }
  }
  return out;
}

/**
 * Remove the canonical source attribute (NOT aliases) for every entry in the
 * metadata. Aliases are intentionally NOT stripped — that matches today's
 * behavior (camelCase variants survive on the output element).
 */
export function stripAttributesFromElement(
  element: Element,
  metadata: Pick<InteractionComposerMetadata, 'strippedAttributes'>,
): void {
  for (const raw of metadata.strippedAttributes) {
    const entry = normalizeStrippedAttribute(raw);
    element.removeAttribute(entry.source);
  }
}
