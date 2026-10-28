import type { Attrs, DOMOutputSpec, Mark, MarkSpec } from 'prosemirror-model';

/**
 * The phrasing elements of QTI 3's `HTMLTextDType` that prosemirror-schema-basic has no mark for,
 * as marks, so an item keeps them through import and export.
 *
 * ProseMirror's parser does not reject an element it has no rule for: it unwraps it and keeps the
 * text. `<sub>` in a chemical formula, `<q>`, `<abbr>`, `<kbd>` and the rest were therefore not
 * refused on load, they were silently flattened — the words stayed, the markup went with the first
 * save. `<b>` and `<i>` were not dropped but rewritten: prosemirror-schema-basic's `strong` and `em`
 * also read them, so they came back as `<strong>` and `<em>`.
 *
 * ## Only QTI's own elements
 *
 * The list is the XSD's (`imsqti_asiv3p0_v1p0.xsd`, `HTMLTextDType`), minus what already has a mark
 * or node (`em`, `strong`, `code`, `a`, `span`, `img`, `br`) and minus `ruby` and `label`. `u`, `s`,
 * `mark`, `del` and `ins` are not QTI 3 elements: keeping them would write items that fail the XSD,
 * so they stay unwrapped, and the `schema-gaps` scan reports them. `ruby` is structural (`rb`, `rt`,
 * `rp`, `rtc` are not phrasing marks) and is left to the scan too.
 *
 * ## Each tag parses only itself
 *
 * Every mark reads exactly one element and writes exactly that element back. ProseKit's own
 * `defineSubscript` / `defineSuperscript` also read `vertical-align` styles and write them back as
 * `<sub>` / `<sup>`, and make the two exclude each other, so `<sub><sup>x</sup></sub>` would lose one
 * of them. These marks exclude nothing.
 *
 * `b` and `i` parse at priority 60, ahead of the `strong` / `em` rules that also read them, so they
 * are kept as written. `b` skips `<b style="font-weight: normal">`, the wrapper Google Docs puts
 * around a whole paste, the way prosemirror-schema-basic's `strong` does.
 *
 * ## Named for the tags they emit
 *
 * `sub`, `sup`, `q` and so on, not ProseKit's `subscript` / `superscript`. Same rule as `em` /
 * `strong` (see `docs/prosekit-divergences.md`): the schema describes itself in the vocabulary it
 * serialises to.
 *
 * ## Attributes
 *
 * Only the ones the XSD gives the element itself: `cite` on `q`, `dir` on `bdo` and `bdi` (without it
 * `bdo` means nothing), `title` on `bdo`.
 */

/** The phrasing elements kept as marks, in schema (nesting) order. */
export const PHRASING_MARK_TAGS = [
  'b',
  'i',
  'small',
  'big',
  'tt',
  'abbr',
  'acronym',
  'cite',
  'dfn',
  'kbd',
  'samp',
  'var',
  'q',
  'sub',
  'sup',
  'bdo',
  'bdi',
] as const;

export type PhrasingMarkTag = (typeof PHRASING_MARK_TAGS)[number];

/** The element's own attributes (beyond the global ones) that each mark keeps. */
const OWN_ATTRS: Partial<Record<PhrasingMarkTag, readonly string[]>> = {
  q: ['cite'],
  bdo: ['dir', 'title'],
  bdi: ['dir'],
};

/** Ahead of prosemirror-schema-basic's `strong` / `em` rules for `<b>` / `<i>` (default 50). */
export const PHRASING_OVER_BASIC_PRIORITY = 60;

function phrasingMark(tag: PhrasingMarkTag): MarkSpec {
  const own = OWN_ATTRS[tag] ?? [];
  const readOwn = (element: HTMLElement): Attrs =>
    Object.fromEntries(own.map(name => [name, element.getAttribute(name) || null]));

  return {
    ...(own.length ? { attrs: Object.fromEntries(own.map(name => [name, { default: null, validate: 'string|null' }])) } : {}),
    parseDOM: [
      {
        tag,
        ...(tag === 'b' || tag === 'i' ? { priority: PHRASING_OVER_BASIC_PRIORITY } : {}),
        getAttrs: (element: HTMLElement) =>
          tag === 'b' && element.style?.fontWeight === 'normal' ? false : own.length ? readOwn(element) : null,
      },
    ],
    toDOM: (mark: Mark): DOMOutputSpec => {
      const dom: Record<string, string> = {};
      for (const name of own) {
        const value = mark.attrs[name] as string | null;
        if (value) dom[name] = value;
      }
      return [tag, dom, 0];
    },
  };
}

/**
 * The marks, keyed by mark name, in the order a schema should register them.
 *
 * Order is rank, and rank is nesting: a schema writes the earlier mark outside the later one. Spread
 * after `em` / `strong` / `code` so every schema in this repo nests them the same way.
 */
export const phrasingMarkSpecs: Readonly<Record<PhrasingMarkTag, MarkSpec>> = Object.fromEntries(
  PHRASING_MARK_TAGS.map(tag => [tag, phrasingMark(tag)]),
) as Record<PhrasingMarkTag, MarkSpec>;
