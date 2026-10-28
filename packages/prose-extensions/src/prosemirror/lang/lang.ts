import type { Attrs, DOMOutputSpec, MarkSpec, Node as ProseMirrorNode, NodeSpec, TagParseRule } from 'prosemirror-model';

/**
 * The language of a stretch of content, as HTML's `lang` attribute.
 *
 * Two pieces: a `lang` mark for an inline `<span lang="…">` (a French phrase in a Dutch sentence),
 * and a `lang` attribute on the block types in {@link LANG_BLOCK_TYPES} (a whole paragraph in
 * English). Without them the parser has no slot for the attribute and drops it, so the language a
 * screen reader or a text-to-speech player needs is gone after the first save.
 *
 * Plain HTML `lang` only. Writing it as `xml:lang`, which is what an XML format such as QTI wants,
 * is the serializer's business, not the schema's — the editor's own DOM is HTML, where `lang` is
 * the attribute the browser reads.
 *
 * `lang=""` (explicitly "unknown") is treated as no language: it parses to nothing and is not
 * written back.
 */

/** The block node types that carry a `lang` attribute, by their prosemirror-schema-basic/-list names. */
export const LANG_BLOCK_TYPES = ['paragraph', 'heading', 'bullet_list', 'ordered_list'] as const;

const XML_NS = 'http://www.w3.org/XML/1998/namespace';

/**
 * The element's language: `lang`, or `xml:lang` when the DOM still has it (XML parsed directly,
 * or HTML that carried the attribute literally).
 */
export function langOf(element: HTMLElement): string | null {
  return (
    element.getAttribute('lang') ||
    element.getAttribute('xml:lang') ||
    element.getAttributeNS?.(XML_NS, 'lang') ||
    null
  );
}

const getLangAttrs = (dom: HTMLElement) => {
  const lang = langOf(dom);
  return lang ? { lang } : false;
};

/**
 * `<span lang="…">`. Matched on the attribute rather than on any `span`, so a span carrying no
 * language is still reported by the schema-gaps scan instead of being claimed by this mark.
 *
 * The second rule is the literal `xml:lang` attribute, not only pasted HTML that carries one:
 * linkedom (the DOM of the Node conversion) reports `xml:lang`'s local name as `xml:lang`, so an XML
 * item re-hosted as HTML arrives there with that attribute where a browser gives it `lang`.
 */
export const langMarkSpec: MarkSpec = {
  attrs: { lang: { validate: 'string' } },
  parseDOM: [
    { tag: 'span[lang]', getAttrs: getLangAttrs },
    { tag: 'span[xml\\:lang]', getAttrs: getLangAttrs },
  ],
  toDOM: mark => ['span', { lang: mark.attrs.lang as string }, 0],
};

/** Put `name="value"` on the outer element of a DOM output spec. */
function withDomAttr(output: DOMOutputSpec, name: string, value: string): DOMOutputSpec {
  if (Array.isArray(output)) {
    const [tag, second, ...rest] = output as readonly unknown[];
    const hasAttrs =
      second != null && typeof second === 'object' && !Array.isArray(second) && (second as Node).nodeType == null;
    return hasAttrs
      ? ([tag, { ...(second as Record<string, unknown>), [name]: value }, ...rest] as unknown as DOMOutputSpec)
      : ([tag, { [name]: value }, ...(second === undefined ? [] : [second]), ...rest] as unknown as DOMOutputSpec);
  }
  const dom = (output as { dom?: Node }).dom ?? (output as Node);
  if ((dom as Element).setAttribute) (dom as Element).setAttribute(name, value);
  return output;
}

/**
 * A copy of a node spec that reads and writes `lang`. For plain-ProseMirror schemas; a ProseKit
 * editor gets the same attribute through `defineNodeAttr` (see `defineLang`).
 *
 * Every tag rule keeps its own match and attributes; `lang` is added to what it returns. The
 * spec's own `toDOM` still decides the element — `lang` is only set on it.
 */
export function withLangAttr(spec: NodeSpec): NodeSpec {
  const toDOM = spec.toDOM;
  return {
    ...spec,
    attrs: { ...spec.attrs, lang: { default: null, validate: 'string|null' } },
    parseDOM: spec.parseDOM?.map((rule): TagParseRule => ({
      ...rule,
      getAttrs: (dom: HTMLElement) => {
        const attrs: Attrs | false | null | undefined = rule.getAttrs ? rule.getAttrs(dom) : rule.attrs;
        if (attrs === false) return false;
        return { ...attrs, lang: langOf(dom) };
      },
    })),
    toDOM: toDOM
      ? (node: ProseMirrorNode) => {
          const output = toDOM(node);
          const lang = node.attrs.lang as string | null;
          return lang ? withDomAttr(output, 'lang', lang) : output;
        }
      : undefined,
  };
}
