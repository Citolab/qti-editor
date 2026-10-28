import { DOMSerializer } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';

import type { DOMOutputSpec, NodeSpec, Node as ProseMirrorNode, TagParseRule } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';

export const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
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
 * of the same name (an importer that re-hosts XML as HTML elements, as prose-qti's does). In the
 * re-hosted case every element is an HTML element, so namespaces are recovered the way the HTML
 * parser assigns them: MathML throughout, except the content of an `<annotation-xml>` whose
 * `encoding` is `text/html` or `application/xhtml+xml`, which is XHTML. The one camel-cased MathML
 * attribute, `definitionURL`, gets its case back (an HTML element lowercases attribute names).
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
 * in Node) still emits `xmlns="http://www.w3.org/1998/Math/MathML"` on `<math>`. A source that is
 * not a well-formed `<math>` element is written as a formula that says so —
 * `<math><merror><mtext>source</mtext></merror></math>` — so it stays MathML, stays visible, and
 * keeps its text for whoever fixes it.
 *
 * In an editor, pair it with {@link createMathmlNodeViewPlugin}: a MathML element has no
 * `contentEditable` or `draggable` property, so ProseMirror's own settings do not take on it.
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
 * The element's MathML source: the subtree with `xmlns` on the root and on any element in another
 * namespace, whitespace normalised (see the note on {@link mathmlNodeSpec}), comments and
 * processing instructions left out.
 *
 * Serialised by hand rather than with `XMLSerializer`, so the result is the same in every DOM: the
 * element may be in the HTML namespace, and linkedom's serializer does no namespace fix-up at all.
 */
export function mathmlSourceOf(element: Element): string {
  // Real MathML (the HTML parser, a paste) carries its namespaces; a re-hosted copy does not.
  const rehosted = element.namespaceURI !== MATHML_NAMESPACE;
  return serializeElement(element, MATHML_NAMESPACE, null, rehosted);
}

function serializeElement(element: Element, namespace: string, parentNamespace: string | null, rehosted: boolean): string {
  const name = element.localName;
  let attrs = namespace !== parentNamespace ? ` xmlns="${namespace}"` : '';
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
    attrs += ` ${attributeName(attr.name, namespace)}="${escapeAttribute(attr.value)}"`;
  }

  const childNodes = Array.from(element.childNodes);
  let children = '';
  childNodes.forEach((child, index) => {
    if (child.nodeType === 1) {
      const childElement = child as Element;
      children += serializeElement(childElement, namespaceOf(childElement, element, namespace, rehosted), namespace, rehosted);
      return;
    }
    if (child.nodeType !== 3 && child.nodeType !== 4) return;
    if (namespace !== MATHML_NAMESPACE) {
      // HTML inside an annotation: its whitespace is not MathML's to normalise.
      children += escapeText(child.textContent ?? '');
      return;
    }
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

/** The namespace a child element belongs in. */
function namespaceOf(child: Element, parent: Element, parentNamespace: string, rehosted: boolean): string {
  if (!rehosted) return child.namespaceURI ?? parentNamespace;
  if (parentNamespace !== MATHML_NAMESPACE) return parentNamespace;
  // The HTML parser's rule: an annotation-xml with an HTML encoding holds HTML.
  if (parent.localName === 'annotation-xml' && /^(text\/html|application\/xhtml\+xml)$/i.test(parent.getAttribute('encoding') ?? '')) {
    return XHTML_NAMESPACE;
  }
  return MATHML_NAMESPACE;
}

/**
 * A prefixed attribute (`xlink:href`) would need its namespace declared for the source to be
 * well-formed, so it is kept by local name. `xml:` is predeclared and stays as written. In MathML,
 * `definitionURL` gets back the case an HTML element took from it.
 */
const attributeName = (name: string, namespace: string) => {
  const local = name.includes(':') && !name.startsWith('xml:') ? name.slice(name.indexOf(':') + 1) : name;
  return namespace === MATHML_NAMESPACE && local === 'definitionurl' ? 'definitionURL' : local;
};

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, '&quot;');

/**
 * Parsed sources, so a formula is parsed once rather than on every render and every export. A DOM
 * spec is plain data that `renderSpec` only reads, so one can be shared. Bounded, and simply dropped
 * when full: a document holds a few dozen formulas, not thousands.
 */
const domSpecCache = new Map<string, DOMOutputSpec>();
const DOM_SPEC_CACHE_LIMIT = 500;

/** The DOM spec for a stored source: the formula rebuilt in the MathML namespace. */
function mathmlDomSpec(source: string): DOMOutputSpec {
  let spec = domSpecCache.get(source);
  if (!spec) {
    spec = buildMathmlDomSpec(source);
    if (domSpecCache.size >= DOM_SPEC_CACHE_LIMIT) domSpecCache.clear();
    domSpecCache.set(source, spec);
  }
  return spec;
}

function buildMathmlDomSpec(source: string): DOMOutputSpec {
  const xmlns = { [`${XMLNS_NAMESPACE} xmlns`]: MATHML_NAMESPACE };
  const parsed = new DOMParser().parseFromString(source, 'application/xml');
  const root = parsed.documentElement;
  if (!root || root.localName !== 'math' || parsed.getElementsByTagName('parsererror').length > 0) {
    // Still a formula, and one that says what is wrong with it: MathML's own error element.
    return [`${MATHML_NAMESPACE} math`, xmlns, ['merror', ['mtext', source]]];
  }
  const [, attrs, ...children] = toSpec(root, MATHML_NAMESPACE) as [string, Record<string, string>, ...(DOMOutputSpec | string)[]];
  return [`${MATHML_NAMESPACE} math`, { ...xmlns, ...attrs }, ...children];
}

function toSpec(element: Element, parentNamespace: string): DOMOutputSpec {
  // From the source's own `xmlns` declarations, not `namespaceURI`: linkedom's XML parser puts every
  // element in the XHTML namespace. The source declares each change of namespace (see
  // `mathmlSourceOf`), so the attribute is all there is to read.
  const namespace = element.getAttribute('xmlns') || parentNamespace;
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
    attrs[attr.name] = attr.value;
  }
  const children: (DOMOutputSpec | string)[] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 1) children.push(toSpec(child as Element, namespace));
    else if (child.nodeType === 3 || child.nodeType === 4) children.push(child.textContent ?? '');
  }
  if (namespace === parentNamespace) return [element.localName, attrs, ...children];
  // An element in another namespace (XHTML in an annotation): named with it, and declaring it, so
  // the export keeps it out of the MathML namespace in linkedom too.
  return [`${namespace} ${element.localName}`, { [`${XMLNS_NAMESPACE} xmlns`]: namespace, ...attrs }, ...children];
}

/** Class on the editor-only wrapper {@link createMathmlNodeView} puts around a formula. */
export const MATHML_NODE_VIEW_CLASS = 'mathml-node-view';

/**
 * The editor's view of a `mathml` node: the formula inside a `<span contenteditable="false"
 * draggable="true">`.
 *
 * Without it ProseMirror renders `toDOM`'s `<math>` directly and sets `contentEditable = "false"`
 * and `draggable = true` on it as properties. Those are `HTMLElement` properties and a
 * `MathMLElement` does not have them, so the assignments create plain JS fields and change
 * nothing: the formula stays editable to the browser (the caret can walk into it, typing lands in
 * its `<mi>`s, and ProseMirror repairs the damage) and cannot be dragged. An HTML wrapper has both.
 *
 * Editor-only: the export path uses `toDOM`, which is unchanged.
 */
export function createMathmlNodeView(node: ProseMirrorNode): NodeView {
  const dom = document.createElement('span');
  dom.className = MATHML_NODE_VIEW_CLASS;
  dom.contentEditable = 'false';
  dom.draggable = true;

  let source = node.attrs.source as string;
  const render = () => {
    const { dom: formula } = DOMSerializer.renderSpec(document, mathmlDomSpec(source));
    dom.replaceChildren(formula);
  };
  render();

  return {
    dom,
    update(next: ProseMirrorNode): boolean {
      if (next.type !== node.type) return false;
      if (next.attrs.source !== source) {
        source = next.attrs.source as string;
        render();
      }
      return true;
    },
    // The formula is ProseMirror's to change, never the browser's.
    ignoreMutation: () => true,
  };
}

/**
 * {@link createMathmlNodeView} as a plugin, for the node named `nodeTypeName` (default `mathml`).
 * Editor-only; a schema without the node is left alone.
 */
export function createMathmlNodeViewPlugin(nodeTypeName = 'mathml'): Plugin {
  return new Plugin({
    key: new PluginKey(`mathml-node-view-${nodeTypeName}`),
    props: {
      nodeViews: { [nodeTypeName]: node => createMathmlNodeView(node) },
    },
  });
}
