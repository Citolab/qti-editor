import { globalAttrSpecs, globalAttrsToDom, hasGlobalAttrs, readGlobalAttrs } from './global-attrs.js';

import type { Attrs, DOMOutputSpec, Node as ProseMirrorNode, NodeSpec, TagParseRule } from 'prosemirror-model';

/**
 * `<div>` in an item body, kept rather than unwrapped. Two cases, told apart by what the div holds:
 *
 * - **A div of blocks** with a `class`, `id`, `lang` or `xml:lang` is a `div` node
 *   ({@link divNodeSpec}), so `<div class="qti-bordered qti-padding-3">` framing a question keeps
 *   its frame. A bare div of blocks carries nothing and is still unwrapped.
 * - **A div of inline content** (text, marks, images, inline elements) is a paragraph written as a
 *   div. {@link withDivParagraph} gives a paragraph spec a `tag` attribute and a `div` rule for it,
 *   so `<div>option A</div>` comes back as a div and not as a `<p>`.
 *
 * Before, ProseMirror's parser unwrapped every div no rule owned: the class and id went, and a div
 * of text came back as `<p>`, so an input → output comparison reported the item as changed.
 *
 * ## Which children make a div a block container
 *
 * HTML's own block elements ({@link BLOCK_ELEMENTS}), and every custom element (a name with a `-`)
 * that the caller does not name as inline. This module knows no vocabulary beyond HTML: a schema
 * that has inline custom elements — QTI's text entry, inline choice, gap, hottext, … — passes their
 * tag names as `inlineElements`. prose-qti does, with `QTI_INLINE_ELEMENTS`.
 *
 * ## Parse-rule priorities
 *
 * ProseKit concatenates `parseDOM` when it merges specs, so each rule's priority decides on purpose:
 *
 * - the div node: **20**, below ProseMirror's default 50, so a node a host defines for a particular
 *   div (`qtiLayoutDiv`) still gets it;
 * - the paragraph's div rule: **25**, above the div node, so a div of text is a paragraph and not a
 *   div wrapping an invented `<p>`; below every other div rule. A paragraph rule with a priority of
 *   its own (the context-scoped ones in a choice or a prompt) keeps that priority for its div rule.
 *
 * ## Never the filler
 *
 * The div node is in `block` and holds blocks, so with every attribute defaulted it could become the
 * node ProseMirror picks to fill an empty `block+` (`ContentMatch.defaultType`, `findWrapping`) —
 * the trap `defineQtiDoc` and the table-cell patch document. Its `class` attribute therefore has no
 * default: it is required (`null` is still a valid value), and ProseMirror never picks a node with a
 * required attribute on its own.
 *
 * ## The `schema-gaps` scan
 *
 * The div node matches on its attributes (`div[class]`, …), but the paragraph's div rule has to match
 * any `<div>`, since a bare `<div>text</div>` is a paragraph too. So the scan does not report a bare
 * div of blocks that is unwrapped. It did not before either: prose-qti's `qtiLayoutDiv` rule already
 * matched every div.
 */

/** HTML elements that make a div a container of blocks rather than a paragraph. */
export const BLOCK_ELEMENTS: ReadonlySet<string> = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hgroup', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'tr', 'ul',
]);

/** The div node's parse priority: below every other div rule. */
export const DIV_PRIORITY = 20;
/** A paragraph's div rule: above the div node, below every other div rule. */
export const DIV_PARAGRAPH_PRIORITY = 25;

export interface DivContentOptions {
  /** Custom elements (tag names) that sit inside a line of text. Every other custom element is a block. */
  inlineElements?: readonly string[];
}

/** True when `element` is a `<div>` whose children are all inline content: a paragraph written as a div. */
export function isInlineContentDiv(element: Element, options: DivContentOptions = {}): boolean {
  if (element.localName !== 'div') return false;
  const inline = new Set(options.inlineElements ?? []);
  return !Array.from(element.children).some(child => {
    const name = child.localName;
    return BLOCK_ELEMENTS.has(name) || (name.includes('-') && !inline.has(name));
  });
}

/** The selectors the div node parses: one per attribute, so a bare div matches none of them. */
export const DIV_SELECTORS = ['div[class]', 'div[id]', 'div[lang]', 'div[xml\\:lang]'] as const;

/** `<div>` of blocks that carries a `class`, `id`, `lang` or `xml:lang`, as a node. */
export const divNodeSpec = {
  group: 'block richtext',
  content: '(paragraph | block)+',
  defining: true,
  attrs: {
    ...globalAttrSpecs,
    // No default: required, so never the filler. See the module note.
    class: { validate: 'string|null' },
  },
  parseDOM: DIV_SELECTORS.map(
    (tag): TagParseRule => ({
      tag,
      priority: DIV_PRIORITY,
      getAttrs: (element: HTMLElement) => {
        const attrs = readGlobalAttrs(element);
        return hasGlobalAttrs(attrs) ? attrs : false;
      },
    }),
  ),
  toDOM: (node: ProseMirrorNode): DOMOutputSpec => ['div', globalAttrsToDom(node.attrs), 0],
} satisfies NodeSpec;

/**
 * A copy of a paragraph spec that also reads a `<div>` of inline content, and writes it back as a
 * div: a `tag` attribute (`'p'` | `'div'`) and, beside each of the spec's `p` rules, a `div` rule
 * with the same context and attributes. `tag` is not splittable: Enter at the end of a div-paragraph
 * opens a plain `p` (a split in the middle copies it, like every other attribute).
 */
export function withDivParagraph(spec: NodeSpec, options: DivContentOptions = {}): NodeSpec {
  const toDOM = spec.toDOM;
  const divRules = (spec.parseDOM ?? []).flatMap((rule): TagParseRule[] => {
    if (!('tag' in rule) || rule.tag !== 'p') return [];
    const pRule = rule as TagParseRule;
    return [
      {
        ...pRule,
        tag: 'div',
        priority: pRule.priority ?? DIV_PARAGRAPH_PRIORITY,
        getAttrs: (element: HTMLElement) => {
          if (!isInlineContentDiv(element, options)) return false;
          const own: Attrs | false | null | undefined = pRule.getAttrs ? pRule.getAttrs(element) : pRule.attrs;
          return own === false ? false : { ...own, tag: 'div' };
        },
      },
    ];
  });
  return {
    ...spec,
    attrs: { ...spec.attrs, tag: { default: 'p', validate: 'string' } },
    parseDOM: [...(spec.parseDOM ?? []), ...divRules],
    toDOM: toDOM
      ? (node: ProseMirrorNode) => {
          const output = toDOM(node);
          if (node.attrs.tag !== 'div' || !Array.isArray(output) || output[0] !== 'p') return output;
          return ['div', ...output.slice(1)] as unknown as DOMOutputSpec;
        }
      : undefined,
  };
}
