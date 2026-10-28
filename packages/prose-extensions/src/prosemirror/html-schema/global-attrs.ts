import type {
  AttributeSpec,
  Attrs,
  DOMOutputSpec,
  Mark,
  MarkSpec,
  Node as ProseMirrorNode,
  NodeSpec,
  TagParseRule,
} from 'prosemirror-model';

/**
 * `class`, `id`, `lang` and `xml:lang` — the global attributes QTI 3 gives every content element
 * (`BaseSequenceXBaseDType` in the XSD) — as node and mark attributes, so an item keeps them through
 * load → save.
 *
 * ProseMirror's parser keeps only what a node's attributes model, so without these
 * `<p class="qti-align-center">` came back as `<p>`, an `id` that a stylesheet, a link, an
 * `aria-labelledby` or a PCI points at disappeared, and so did the language a screen reader needs.
 *
 * ## `lang` and `xml:lang` are two attributes
 *
 * The XSD declares both, and an item may carry either or both. Each is its own attribute here
 * (`lang`, and `xmlLang` for `xml:lang`), read from and written to the attribute it came from, so
 * neither is rewritten into the other. `xml:lang` is written in the XML namespace (ProseMirror's
 * `"namespace name"` attribute key): the XML export carries a real `xml:lang`, and in the editor's
 * HTML DOM the browser reads it as the element's language, as it does `lang`. The parser reads it as
 * the literal `xml:lang` attribute an HTML DOM has (prose-qti's import keeps that name, and HTML
 * written from the editor carries it), or in the XML namespace.
 *
 * `null` means "no attribute", so an element without them serialises exactly as before.
 *
 * ## Not here
 *
 * `dir`, `label` and the ARIA attributes, the rest of the XSD group. Each would be one more entry in
 * {@link GLOBAL_ATTRS}; none was needed by the corpus or asked for.
 *
 * Which ProseKit attributes are `splittable` (Enter carries them into the next block) is the ProseKit
 * layer's business: see `prosekit/global-attrs.ts`.
 */

export const XML_NS = 'http://www.w3.org/XML/1998/namespace';

/** The DOM attribute each of these node / mark attributes is read from and written to. */
export const GLOBAL_ATTRS = {
  class: 'class',
  id: 'id',
  lang: 'lang',
  xmlLang: 'xml:lang',
} as const;

export type GlobalAttrName = keyof typeof GLOBAL_ATTRS;

/** What the attributes hold: the attribute's value, or `null` when the element has none. */
export type GlobalAttrs = Record<GlobalAttrName, string | null>;

const GLOBAL_ATTR_NAMES = Object.keys(GLOBAL_ATTRS) as GlobalAttrName[];

/** The attribute specs: optional strings, `null` by default. */
export const globalAttrSpecs: Record<GlobalAttrName, AttributeSpec> = Object.fromEntries(
  GLOBAL_ATTR_NAMES.map(name => [name, { default: null, validate: 'string|null' }]),
) as Record<GlobalAttrName, AttributeSpec>;

/**
 * Node types, by their prosemirror-schema-basic / -list / -tables names, that get these attributes
 * from {@link withGlobalAttrs} (plain ProseMirror) or `defineNodeGlobalAttrs` (ProseKit). One list
 * for both schema paths; a schema skips the names it has no node for. The specs this module and
 * prose-qti define themselves carry the attributes in the spec instead.
 */
export const GLOBAL_ATTR_NODES = [
  'paragraph',
  'heading',
  'blockquote',
  'horizontal_rule',
  'code_block',
  'hard_break',
  'image',
  'bullet_list',
  'ordered_list',
  'list_item',
  'table',
  'table_row',
  'table_cell',
  'table_header',
] as const;

/** The same for marks: prosemirror-schema-basic's. The phrasing marks and `span` carry them already. */
export const GLOBAL_ATTR_MARKS = ['link', 'em', 'strong', 'code'] as const;

/** The value of one of these attributes on an element, or `null`. An empty value counts as none. */
export function readGlobalAttr(element: Element, name: GlobalAttrName): string | null {
  if (name === 'xmlLang') {
    const literal = element.getAttribute('xml:lang');
    if (literal) return literal;
    // By namespace, not `getAttributeNS`: linkedom, the Node conversion's DOM, ignores the namespace
    // there and would return a plain `lang`.
    const namespaced = Array.from(element.attributes ?? []).find(
      attr => attr.namespaceURI === XML_NS && attr.localName === 'lang',
    );
    return namespaced?.value || null;
  }
  return element.getAttribute(GLOBAL_ATTRS[name]) || null;
}

/** All four, for a `getAttrs`. */
export function readGlobalAttrs(element: Element): GlobalAttrs {
  return Object.fromEntries(GLOBAL_ATTR_NAMES.map(name => [name, readGlobalAttr(element, name)])) as GlobalAttrs;
}

/** True when the element carries at least one of them. */
export function hasGlobalAttrs(attrs: Partial<GlobalAttrs>): boolean {
  return GLOBAL_ATTR_NAMES.some(name => attrs[name] != null);
}

/**
 * The `toDOM` key for one of them: the DOM attribute name, or `"namespace name"` for `xml:lang`,
 * which `DOMSerializer` turns into `setAttributeNS`.
 */
export function globalAttrDomKey(name: GlobalAttrName): string {
  return name === 'xmlLang' ? `${XML_NS} xml:lang` : GLOBAL_ATTRS[name];
}

/** The `toDOM` attributes for the ones the node or mark has. */
export function globalAttrsToDom(attrs: Attrs): Record<string, string> {
  const dom: Record<string, string> = {};
  for (const name of GLOBAL_ATTR_NAMES) {
    const value: unknown = attrs[name];
    if (typeof value === 'string' && value) dom[globalAttrDomKey(name)] = value;
  }
  return dom;
}

/** Put `attrs` on the outer element of a DOM output spec. */
function withDomAttrs(output: DOMOutputSpec, attrs: Record<string, string>): DOMOutputSpec {
  if (Object.keys(attrs).length === 0) return output;
  if (Array.isArray(output)) {
    const [tag, second, ...rest] = output as readonly unknown[];
    const hasAttrs =
      second != null && typeof second === 'object' && !Array.isArray(second) && (second as Node).nodeType == null;
    return (
      hasAttrs
        ? [tag, { ...(second as Record<string, unknown>), ...attrs }, ...rest]
        : [tag, attrs, ...(second === undefined ? [] : [second]), ...rest]
    ) as unknown as DOMOutputSpec;
  }
  const dom = ((output as { dom?: Node }).dom ?? output) as Element;
  if (typeof dom.setAttribute === 'function') {
    for (const [key, value] of Object.entries(attrs)) {
      const space = key.indexOf(' ');
      if (space > 0) dom.setAttributeNS(key.slice(0, space), key.slice(space + 1), value);
      else dom.setAttribute(key, value);
    }
  }
  return output;
}

/** Specs `withGlobalAttrs` returned, so a second call is a no-op. */
const wrapped = new WeakSet<NodeSpec | MarkSpec>();

/**
 * A copy of a node or mark spec that keeps the global attributes. For plain-ProseMirror schemas and
 * for the specs both schema paths share; a ProseKit editor gets the same attributes on a type it
 * does not own through `defineNodeGlobalAttrs` / `defineMarkGlobalAttrs`.
 *
 * Every tag rule keeps its own match, context, priority and attributes, and adds these to what it
 * returns; style rules are left alone. The spec's own `toDOM` still decides the element — the
 * attributes are only set on its outer element.
 */
export function withGlobalAttrs<T extends NodeSpec | MarkSpec>(spec: T): T {
  if (wrapped.has(spec)) return spec;
  const toDOM = spec.toDOM as ((value: ProseMirrorNode | Mark, inline: boolean) => DOMOutputSpec) | undefined;
  const result = {
    ...spec,
    attrs: { ...spec.attrs, ...globalAttrSpecs },
    parseDOM: spec.parseDOM?.map(rule => {
      if (!('tag' in rule) || rule.tag === undefined) return rule;
      const tagRule = rule as TagParseRule;
      return {
        ...tagRule,
        getAttrs: (dom: HTMLElement) => {
          const own: Attrs | false | null | undefined = tagRule.getAttrs ? tagRule.getAttrs(dom) : tagRule.attrs;
          if (own === false) return false;
          return { ...own, ...readGlobalAttrs(dom) };
        },
      };
    }),
    toDOM: toDOM
      ? (value: ProseMirrorNode | Mark, inline: boolean) => withDomAttrs(toDOM(value, inline), globalAttrsToDom(value.attrs))
      : undefined,
  } as T;
  wrapped.add(result);
  return result;
}

/**
 * A copy of a `nodes` or `marks` object in which every entry named in {@link GLOBAL_ATTR_NODES} or
 * {@link GLOBAL_ATTR_MARKS} has gone through {@link withGlobalAttrs}. Order and the other entries
 * are unchanged.
 */
export function withGlobalAttrsOn<T extends Record<string, NodeSpec | MarkSpec>>(specs: T): T {
  const names = new Set<string>([...GLOBAL_ATTR_NODES, ...GLOBAL_ATTR_MARKS]);
  return Object.fromEntries(
    Object.entries(specs).map(([name, spec]) => [name, names.has(name) ? withGlobalAttrs(spec) : spec]),
  ) as T;
}
