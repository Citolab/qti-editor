/**
 * ROUNDTRIP-XML → PM — item-body only.
 *
 * Reads a roundtrip-xml `<qti-item-body>` (the output of `pm-to-roundtrip-xml.ts`
 * or the composer's item-body) and rehydrates a ProseMirror document. The input
 * document MUST have `<qti-item-body>` as its document element (e.g. via the
 * `reduceToItemBody` transform); otherwise it throws. It is the inverse of
 * `pm-to-roundtrip-xml.ts`: the item-body already carries CANONICAL authoring
 * attributes (`correct-response` / `score` / …) inline, so it simply parses the
 * content into a ProseMirror document with the schema's `DOMParser` (whose
 * node-spec `parseDOM` reads those canonical attributes directly).
 *
 * `qti-response-declaration` / `qti-response-processing` are not part of the
 * roundtrip-xml item-body — authoring state lives in the canonical attributes.
 *
 * No ProseKit, no Lit. Pure DOM + prosemirror-model.
 */
import { DOMParser as PMDOMParser, type Node as ProseMirrorNode, type Schema } from 'prosemirror-model';

export function roundtripXmlToPm(xmlDoc: XMLDocument, schema: Schema): ProseMirrorNode {
  const itemBody = xmlDoc.documentElement;
  if (!itemBody || itemBody.localName !== 'qti-item-body') {
    throw new Error(
      `roundtripXmlToPm expects a <qti-item-body> document element, received <${itemBody?.localName ?? 'null'}>`,
    );
  }

  // Re-host the item-body content as HTML so the schema's DOMParser (which
  // matches lowercase tag names) can read the canonical authoring attributes.
  //
  // We rebuild the tree node-by-node into HTML elements rather than going
  // through `XMLSerializer` + `innerHTML`. The string round-trip emits empty
  // elements self-closed (e.g. `<qti-gap/>`), but the HTML parser does NOT treat
  // custom elements as void: it reopens them, nesting every following sibling
  // inside the first empty element. Since `qti-gap` is an atom, that nested
  // content is then silently dropped on parse. A direct DOM import keeps empty
  // elements empty and preserves sibling order.
  const htmlBody = importXmlAsHtml(itemBody, document) as HTMLElement;

  // `parse` only fills content; the doc node's own attributes come from the
  // `topNode`. The item-body acts as a body-double for the document, so hoist
  // any attribute the schema's doc node declares (e.g. identifier/title) from
  // the item-body onto the ProseMirror document.
  const declaredDocAttrs = schema.nodes.doc.spec.attrs ?? {};
  const docAttrs: Record<string, string> = {};
  for (const name of Object.keys(declaredDocAttrs)) {
    const value = htmlBody.getAttribute(name);
    if (value !== null) docAttrs[name] = value;
  }
  const topNode = Object.keys(docAttrs).length ? schema.nodes.doc.create(docAttrs) : undefined;

  return PMDOMParser.fromSchema(schema).parse(htmlBody, topNode ? { topNode } : undefined);
}

/**
 * Recursively clone an XML node into an HTML element owned by `htmlDoc`. Tag
 * names are lowercased into the HTML namespace (so PM's tag matching works) and
 * namespace declarations are dropped. Unlike a `XMLSerializer` + `innerHTML`
 * round-trip, this keeps empty custom elements empty instead of reopening them
 * and nesting their following siblings inside (which silently drops content for
 * atom nodes such as `qti-gap`).
 */
function importXmlAsHtml(xmlNode: Node, htmlDoc: Document): Node {
  if (xmlNode.nodeType === Node.ELEMENT_NODE) {
    const xmlEl = xmlNode as Element;
    const htmlEl = htmlDoc.createElement(xmlEl.localName);
    for (const attr of Array.from(xmlEl.attributes)) {
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
      htmlEl.setAttribute(attr.localName, attr.value);
    }
    for (const child of Array.from(xmlEl.childNodes)) {
      htmlEl.appendChild(importXmlAsHtml(child, htmlDoc));
    }
    return htmlEl;
  }
  return htmlDoc.createTextNode(xmlNode.textContent ?? '');
}

