/**
 * Save XML — pure ProseMirror
 *
 * Generic ProseMirror ↔ XML serialization with no prosekit dependency.
 * The prosekit-integration package wraps this and injects ListDOMSerializer
 * for list-aware serialization in the editor app.
 */

import { DOMSerializer, type Node as ProseMirrorNode } from 'prosemirror-model';

// Serialize a ProseMirror doc node to QTI item-body XML string.
// Accepts an optional serializer so callers (e.g. prosekit-integration) can
// inject a list-aware DOMSerializer subclass without duplicating this logic.
export function xmlFromNode(
  node: ProseMirrorNode,
  serializer: DOMSerializer = DOMSerializer.fromSchema(node.type.schema),
): string {
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

function formatXml(xml: string): string {
  const INDENT = '    ';
  let formatted = '';
  let indent = 0;

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

function cleanEmptyNamespaces(html: string): string {
  return html
    .replace(/\s+xmlns=""/g, '')
    .replace(/\s+xmlns:xsi="[^"]*"/g, '')
    .replace(/\s+xsi:schemaLocation="[^"]*"/g, '');
}

export function xmlToHTML(xml: string): string {
  let xmlToParse = xml.trim();

  const assessmentItemMatches = xml.match(/<qti-assessment-item[\s>]/g);
  const hasMultipleItems = assessmentItemMatches && assessmentItemMatches.length > 1;

  if (hasMultipleItems) {
    xmlToParse = `<items>${xml}</items>`;
  }

  const doc = new DOMParser().parseFromString(xmlToParse, 'application/xml');
  const serializer = new XMLSerializer();

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.error('XML parsing error:', parseError.textContent);
    throw new Error('Failed to parse XML: ' + parseError.textContent);
  }

  if (hasMultipleItems) {
    const assessmentItems = doc.querySelectorAll('qti-assessment-item');
    const htmlParts: string[] = [];

    assessmentItems.forEach((item, index) => {
      const itemBody = item.querySelector('qti-item-body');
      if (itemBody) {
        if (index > 0) {
          htmlParts.push('<qti-item-divider></qti-item-divider>');
        }

        const content = Array.from(itemBody.childNodes)
          .map(node => serializer.serializeToString(node))
          .join('');
        htmlParts.push(cleanEmptyNamespaces(content));
      }
    });

    return htmlParts.join('');
  } else {
    const itemBody = doc.querySelector('qti-item-body') ?? doc.documentElement;
    const content = Array.from(itemBody.childNodes)
      .map(node => serializer.serializeToString(node))
      .join('');
    return cleanEmptyNamespaces(content);
  }
}
