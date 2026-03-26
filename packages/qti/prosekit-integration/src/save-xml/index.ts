/**
 * Save XML
 *
 * Generic ProseMirror ↔ XML serialization.
 * The XML counterpart to prosekit's htmlFromNode() / jsonFromNode().
 */

import { ListDOMSerializer } from 'prosekit/extensions/list';

import type { ProseMirrorNode } from 'prosekit/pm/model';

/** Serialize a ProseMirror doc node to QTI item-body XML string. */
export function xmlFromNode(node: ProseMirrorNode): string {
  const serializer = ListDOMSerializer.fromSchema(node.type.schema);
  const fragment = serializer.serializeFragment(node.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return htmlToXmlString(wrapper.innerHTML);
}
 
function htmlToXmlString(html: string): string {
  const wrapped = `<qti-item-body>${html}</qti-item-body>`;
  const parsed = new DOMParser().parseFromString(wrapped, 'application/xml');
  if (parsed.querySelector('parsererror')) return wrapped;
  return new XMLSerializer().serializeToString(parsed.documentElement);
}

/** Extract HTML from XML string (for loading into editor via jsonFromHTML). */
export function xmlToHTML(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const itemBody = doc.querySelector('qti-item-body') ?? doc.documentElement;
  const serializer = new XMLSerializer();
  return Array.from(itemBody.childNodes)
    .map(node => serializer.serializeToString(node))
    .join('');
}
