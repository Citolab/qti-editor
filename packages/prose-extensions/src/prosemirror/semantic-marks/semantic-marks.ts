import type { MarkSpec } from 'prosemirror-model';

/**
 * Inline phrasing elements an item body carries, as marks, so they survive an import.
 *
 * ProseMirror's parser does not reject an element it has no rule for: it unwraps it and keeps the
 * text. `<u>`, `<s>`, `<mark>`, `<q>`, `<sub>` and `<sup>` were therefore not refused on load, they
 * were silently flattened — the words stayed, the underline, the struck-through distractor, the
 * chemical formula's subscripts and the quotation went. `<span class="qti-underline">`, the QTI shared
 * CSS vocabulary's underline, went the same way.
 *
 * ## Each tag parses only itself
 *
 * Every mark here reads exactly one element and writes exactly that element back. ProseKit's own
 * `defineUnderline` / `defineStrike` / `defineSubscript` / `defineSuperscript` also accept `<strike>`,
 * `<del>`, `<underline>` and `text-decoration` / `vertical-align` styles, and serialise them all as
 * `<u>`, `<s>`, `<sub>`, `<sup>`. That is right for pasting into a word processor and wrong for an item:
 * the export would rewrite markup the author wrote, and an import that changes what it reads cannot
 * be told apart from one that loses it. `<del>` in particular is a different element from `<s>` (an
 * edit, not a stylistic strike).
 *
 * `sub` and `sup` deliberately do not exclude each other, unlike ProseKit's: an exclusion would
 * drop one of two nested elements on parse.
 *
 * ## Named for the tags they emit
 *
 * `u`, `s`, `mark`, `q`, `sub`, `sup` — not ProseKit's `underline`, `strike`, `highlight`,
 * `subscript`, `superscript`. Same rule as `em` / `strong` (see `docs/prosekit-divergences.md`): the
 * schema describes itself in the vocabulary it serialises to.
 *
 * `code` is not here: prosemirror-schema-basic already has it, and `defineBasicExtension` takes that
 * spec as-is.
 *
 * ## `qtiUnderline`
 *
 * `<span class="qti-underline">` is a separate mark rather than a second parse rule on `u`, because
 * a rule on `u` would write it back as `<u>`. The mark keeps the span's whole `class` value, so a span
 * that also carries other classes is written back with all of them.
 */

/** The plain phrasing elements, in schema (nesting) order. */
export const SEMANTIC_MARK_TAGS = ['u', 's', 'mark', 'q', 'sub', 'sup'] as const;

export type SemanticMarkTag = (typeof SEMANTIC_MARK_TAGS)[number];

const plainMark = (tag: SemanticMarkTag): MarkSpec => ({
  parseDOM: [{ tag }],
  toDOM: () => [tag, 0],
});

/** `<span class="qti-underline">`, the QTI shared CSS vocabulary's underline. */
export const qtiUnderlineMarkSpec: MarkSpec = {
  attrs: { class: { default: 'qti-underline', validate: 'string' } },
  parseDOM: [
    {
      tag: 'span.qti-underline',
      getAttrs: (dom: HTMLElement) => ({ class: dom.getAttribute('class') ?? 'qti-underline' }),
    },
  ],
  toDOM: mark => ['span', { class: mark.attrs.class as string }, 0],
};

/**
 * The marks, keyed by mark name, in the order a schema should register them.
 *
 * Order is rank, and rank is nesting: a schema writes the earlier mark outside the later one. Spread
 * after `em` / `strong` / `code` so every schema in this repo nests them the same way.
 */
export const semanticMarkSpecs: Readonly<Record<SemanticMarkTag | 'qtiUnderline', MarkSpec>> = {
  ...(Object.fromEntries(SEMANTIC_MARK_TAGS.map(tag => [tag, plainMark(tag)])) as Record<
    SemanticMarkTag,
    MarkSpec
  >),
  qtiUnderline: qtiUnderlineMarkSpec,
};
