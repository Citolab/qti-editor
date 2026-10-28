import { globalAttrSpecs, globalAttrsToDom, hasGlobalAttrs, readGlobalAttrs } from './global-attrs.js';

import type { DOMOutputSpec, Mark, MarkSpec, TagParseRule } from 'prosemirror-model';

/**
 * `<span>` with a `class`, an `id`, a `lang` or an `xml:lang`, as one mark that holds all four.
 *
 * Without it ProseMirror's parser unwrapped the span and kept the text, so `<span class="qti-hidden">`,
 * `<span class="qti-underline">` (QTI's shared-CSS underline) and `<span xml:lang="fr">` all lost
 * exactly what made them worth writing. One mark rather than one per purpose: a span can carry a
 * class and a language at once, and with a mark per attribute only one parse rule could claim it.
 *
 * - **Matched on the attributes**, not on every `span`: a bare `<span>` carries nothing and is still
 *   unwrapped, and the `schema-gaps` scan, which matches rule selectors, still reports it.
 *   `span[xml\:lang]` matches the literal `xml:lang` attribute, which is what an HTML DOM has.
 * - **`excludes: ''`**, so nested and adjacent spans with different attributes stay separate spans.
 * - **Priority 20**, below ProseMirror's default 50, so a mark or node a host defines for a
 *   particular span still gets it.
 * - **Ranked first** of the content marks in both schemas (`qtiBasicMarks`, and the ProseKit base,
 *   which registers it after `em` / `strong` because ProseKit ranks a later registration higher), so
 *   a span is written outside `em`, `strong` and the phrasing marks: `<span xml:lang="fr">a <em>b</em></span>`
 *   comes back as written.
 */

/** Below ProseMirror's default 50, so any more specific span rule wins. */
export const SPAN_PRIORITY = 20;

/** The selectors the span mark parses: one per attribute, so a bare span matches none. */
export const SPAN_SELECTORS = ['span[class]', 'span[id]', 'span[lang]', 'span[xml\\:lang]'] as const;

export const spanMarkSpec = {
  attrs: globalAttrSpecs,
  excludes: '',
  parseDOM: SPAN_SELECTORS.map(
    (tag): TagParseRule => ({
      tag,
      priority: SPAN_PRIORITY,
      getAttrs: (element: HTMLElement) => {
        const attrs = readGlobalAttrs(element);
        // `class=""` and the like: nothing to keep, so leave the span to be unwrapped.
        return hasGlobalAttrs(attrs) ? attrs : false;
      },
    }),
  ),
  toDOM: (mark: Mark): DOMOutputSpec => ['span', globalAttrsToDom(mark.attrs), 0],
} satisfies MarkSpec;
