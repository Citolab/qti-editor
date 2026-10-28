import type { DOMOutputSpec, NodeSpec, Node as ProseMirrorNode, TagParseRule } from 'prosemirror-model';

export const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';

/**
 * A `<math>` formula, kept whole as an inline atom.
 *
 * ## An atom holding its source
 *
 * The formula is not edited in the text: the node is a leaf, and its one attribute, `source`, is
 * the formula's own MathML, serialised. ProseMirror's parser never looks inside a leaf's element,
 * so nothing in a formula needs a node or mark of its own, and nothing in it is lost — it comes back
 * out exactly as it went in (whitespace aside, see below). Changing a formula means changing the
 * source, e.g. in an XML view.
 *
 * ## Whatever namespace the element arrives in
 *
 * The parse rule reads the element by local name and rebuilds it in the MathML namespace, so it does
 * not matter whether `<math>` arrives as real MathML (the HTML parser, a paste) or as an HTML element
 * of the same name (an importer that re-hosts XML as HTML elements, as prose-qti's does).
 *
 * ## Whitespace
 *
 * MathML ignores whitespace between elements and trims and collapses it inside token elements
 * (MathML 3, §2.1.7), so the source is stored with whitespace normalised that way. That is not
 * cosmetic: an export that pretty-prints its XML puts newlines and indentation between the
 * formula's elements, and a source that kept them would grow on every round trip.
 *
 * ## Output
 *
 * `toDOM` builds the formula in the MathML namespace (the spec's root tag carries the namespace, and
 * ProseMirror creates the children in it too), so the browser renders it, and it writes the
 * namespace declaration as an attribute so a serialiser that does no namespace fix-up (linkedom,
 * in Node) still emits `xmlns="http://www.w3.org/1998/Math/MathML"` on `<math>`.
 *
 * Plain ProseMirror spec; with ProseKit, `defineNodeSpec({ name: 'mathml', ...mathmlNodeSpec })`.
 */
export const mathmlNodeSpec = {
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  draggable: true,
  // Required: a formula has no sensible default, and a node with a required attribute is never
  // picked to fill an empty slot (`ContentMatch.defaultType`).
  attrs: { source: { validate: 'string' } },
  parseDOM: [
    {
      tag: 'math',
      getAttrs: (element: HTMLElement) => ({ source: mathmlSourceOf(element) }),
    },
  ] satisfies TagParseRule[],
  toDOM: (node: ProseMirrorNode): DOMOutputSpec => mathmlDomSpec(node.attrs.source as string),
} satisfies NodeSpec;

/**
 * The element's MathML source: the subtree in the MathML namespace, with `xmlns` on the root,
 * whitespace normalised (see the note on {@link mathmlNodeSpec}), comments and processing
 * instructions left out.
 *
 * Serialised by hand rather than with `XMLSerializer`, so the result is the same in every DOM: the
 * element may be in the HTML namespace, and linkedom's serializer does no namespace fix-up at all.
 */
export function mathmlSourceOf(element: Element): string {
  return serializeElement(element, true);
}

function serializeElement(element: Element, isRoot: boolean): string {
  const name = element.localName;
  let attrs = isRoot ? ` xmlns="${MATHML_NAMESPACE}"` : '';
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
    attrs += ` ${attributeName(attr.name)}="${escapeAttribute(attr.value)}"`;
  }

  const childNodes = Array.from(element.childNodes);
  let children = '';
  childNodes.forEach((child, index) => {
    if (child.nodeType === 1) {
      children += serializeElement(child as Element, false);
      return;
    }
    if (child.nodeType !== 3 && child.nodeType !== 4) return;
    // Whitespace-only text is either between elements (ignored) or all of a token's content
    // (trimmed to nothing). Otherwise collapse runs, and trim at the edges of the element's content.
    let text = (child.textContent ?? '').replace(/[ \t\n\r]+/g, ' ');
    if (/^[ \t\n\r]*$/.test(text)) return;
    if (index === 0) text = text.replace(/^ /, '');
    if (index === childNodes.length - 1) text = text.replace(/ $/, '');
    children += escapeText(text);
  });

  return children ? `<${name}${attrs}>${children}</${name}>` : `<${name}${attrs}/>`;
}

/**
 * A prefixed attribute (`xlink:href`) would need its namespace declared for the source to be
 * well-formed, so it is kept by local name. `xml:` is predeclared and stays as written.
 */
const attributeName = (name: string) =>
  name.includes(':') && !name.startsWith('xml:') ? name.slice(name.indexOf(':') + 1) : name;

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, '&quot;');

/**
 * The DOM spec for a stored source: the formula rebuilt in the MathML namespace. A source that does
 * not parse as a `<math>` element is shown as its text rather than dropped.
 */
function mathmlDomSpec(source: string): DOMOutputSpec {
  const parsed = new DOMParser().parseFromString(source, 'application/xml');
  const root = parsed.documentElement;
  if (!root || root.localName !== 'math' || parsed.getElementsByTagName('parsererror').length > 0) {
    return ['span', { class: 'mathml-source' }, source];
  }
  const [, attrs, ...children] = toSpec(root) as [string, Record<string, string>, ...(DOMOutputSpec | string)[]];
  return [`${MATHML_NAMESPACE} math`, { [`${XMLNS_NAMESPACE} xmlns`]: MATHML_NAMESPACE, ...attrs }, ...children];
}

function toSpec(element: Element): DOMOutputSpec {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
    attrs[attr.name] = attr.value;
  }
  const children: (DOMOutputSpec | string)[] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 1) children.push(toSpec(child as Element));
    else if (child.nodeType === 3 || child.nodeType === 4) children.push(child.textContent ?? '');
  }
  return [element.localName, attrs, ...children];
}
