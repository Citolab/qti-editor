/**
 * PURE-PROSEMIRROR ROUNDTRIP IMPORT — item-body only.
 *
 * Reads an editor-origin `<qti-item-body>` (the output of `roundtrip-export.ts`
 * or the composer's item-body) and rehydrates a ProseMirror document. It is the
 * inverse of `roundtrip-export.ts`:
 *
 *   1. Maps each interaction's `data-*` mirrors back to the canonical authoring
 *      attribute the node-spec `parseDOM` expects (e.g. `data-correct-response`
 *      → `correct-response`) — using the same `collectMirrorMappings` source of
 *      truth so the contract stays paired.
 *   2. Parses the resulting HTML into a ProseMirror document with the schema's
 *      `DOMParser` (no ProseKit).
 *
 * `qti-response-declaration` / `qti-response-processing` are intentionally
 * ignored — authoring state lives only in the `data-*` mirrors, matching the
 * lossless roundtrip contract.
 *
 * No ProseKit, no Lit. Pure DOM + prosemirror-model.
 */
import { DOMParser as PMDOMParser, type Node as ProseMirrorNode, type Schema } from 'prosemirror-model';
import { type InteractionComposerMetadata } from '@qti-editor/interfaces';

import { collectMirrorMappings } from './composer/non-qti-attributes.js';

/**
 * Build the inverse `data-*` → canonical attribute map. Multiple aliases can
 * point at the same `data-*` target; the canonical source (the primary,
 * non-alias entry) wins so each `data-*` attribute maps to exactly one editor
 * attribute.
 */
function buildInverseMirrorMap(
  interactionMetadata: readonly InteractionComposerMetadata[],
): Map<string, ReadonlyArray<{ source: string; target: string }>> {
  const byTag = new Map<string, ReadonlyArray<{ source: string; target: string }>>();
  for (const metadata of interactionMetadata) {
    const seen = new Set<string>();
    const inverse: Array<{ source: string; target: string }> = [];
    for (const { source, target } of collectMirrorMappings(metadata)) {
      // `source` is the canonical editor attr, `target` is the `data-*` mirror.
      if (seen.has(target)) continue;
      seen.add(target);
      inverse.push({ source: target, target: source });
    }
    byTag.set(metadata.tagName, inverse);
  }
  return byTag;
}

/**
 * Restore canonical authoring attributes from `data-*` mirrors, in place.
 */
function applyInverseMirrors(
  body: HTMLElement,
  interactionMetadata: readonly InteractionComposerMetadata[],
): void {
  const byTag = buildInverseMirrorMap(interactionMetadata);
  byTag.forEach((mappings, tagName) => {
    body.querySelectorAll(tagName).forEach(element => {
      for (const { source, target } of mappings) {
        const value = element.getAttribute(source);
        if (value == null) continue;
        if (!element.hasAttribute(target)) element.setAttribute(target, value);
        element.removeAttribute(source);
      }
    });
  });
}

export function prosemirrorFromQtiItem(
  xml: string,
  schema: Schema,
  interactionMetadata: readonly InteractionComposerMetadata[] = [],
): ProseMirrorNode {
  const xmlDoc = new globalThis.DOMParser().parseFromString(xml, 'application/xml');
  const itemBody =
    xmlDoc.querySelector('qti-item-body') ?? xmlDoc.documentElement;

  // Re-host the item-body content as HTML so the schema's DOMParser (which
  // matches lowercase tag names) can read it, then restore canonical attrs.
  const template = document.createElement('template');
  template.innerHTML = new XMLSerializer().serializeToString(itemBody);
  const htmlBody = template.content.firstElementChild as HTMLElement;

  applyInverseMirrors(htmlBody, interactionMetadata);

  return PMDOMParser.fromSchema(schema).parse(htmlBody);
}
