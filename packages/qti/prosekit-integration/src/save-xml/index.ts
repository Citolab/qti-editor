/**
 * Save XML
 *
 * Generic ProseMirror ↔ XML serialization.
 * The XML counterpart to prosekit's htmlFromNode() / jsonFromNode().
 */

import { ListDOMSerializer } from 'prosekit/extensions/list';

import type { ProseMirrorNode } from 'prosekit/pm/model';

// Serialize a ProseMirror doc node to QTI item-body XML string
export function xmlFromNode(node: ProseMirrorNode): string {
  const serializer = ListDOMSerializer.fromSchema(node.type.schema);
  const fragment = serializer.serializeFragment(node.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return htmlToXmlString(wrapper.innerHTML);
}

const VOID_HTML_TAGS = [
  'img', 'br', 'hr', 'input', 'meta', 'link',
  'source', 'area', 'col', 'embed', 'param', 'track', 'wbr',
];

function htmlToXmlCompatible(html: string): string {
  // Replace &nbsp; with numeric entity (XML doesn't define &nbsp;)
  let result = html.replace(/&nbsp;/g, '&#160;');
  
  const voidTagPattern = new RegExp(`<(${VOID_HTML_TAGS.join('|')})(\\s[^<>]*?)?>`, 'gi');
  result = result.replace(voidTagPattern, match => {
    if (match.endsWith('/>')) return match;
    return `${match.slice(0, -1)} />`;
  });
  
  return result;
}
 
function htmlToXmlString(html: string): string {
  const xmlCompatibleHtml = htmlToXmlCompatible(html);
  const wrapped = `<qti-item-body>${xmlCompatibleHtml}</qti-item-body>`;
  const parsed = new DOMParser().parseFromString(wrapped, 'application/xml');
  if (parsed.querySelector('parsererror')) return wrapped;
  const raw = new XMLSerializer().serializeToString(parsed.documentElement);
  return formatXml(raw);
}

// Format XML with proper indentation
function formatXml(xml: string): string {
  const INDENT = '    ';
  let formatted = '';
  let indent = 0;
  
  // Split on tags while keeping them
  const parts = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/);
  
  for (const part of parts) {
    if (!part.trim()) continue;
    
    const isClosingTag = part.startsWith('</');
    const isSelfClosing = part.endsWith('/>');
    const isOpeningTag = part.startsWith('<') && !isClosingTag && !isSelfClosing;
    
    if (isClosingTag) indent--;
    
    formatted += INDENT.repeat(Math.max(0, indent)) + part + '\n';
    
    if (isOpeningTag) indent++;
  }
  
  return formatted.trim();
}

export function xmlToHTML(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const itemBody = doc.querySelector('qti-item-body') ?? doc.documentElement;
  const serializer = new XMLSerializer();
  return Array.from(itemBody.childNodes)
    .map(node => serializer.serializeToString(node))
    .join('');
}
