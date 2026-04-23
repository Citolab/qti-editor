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

/**
 * Remove empty xmlns attributes that can interfere with parsing.
 * These occur when QTI exports have xmlns="" on child elements.
 */
function cleanEmptyNamespaces(html: string): string {
  // Remove xmlns="" and xmlns:xsi declarations that interfere with parsing
  return html
    .replace(/\s+xmlns=""/g, '')
    .replace(/\s+xmlns:xsi="[^"]*"/g, '')
    .replace(/\s+xsi:schemaLocation="[^"]*"/g, '');
}

export function xmlToHTML(xml: string): string {
  // Check if we have multiple assessment items (invalid XML structure but common in QTI exports)
  // Wrap in a temporary container to make it valid XML for parsing
  let xmlToParse = xml.trim();
  
  // Detect multiple root elements by checking for multiple qti-assessment-item tags
  const assessmentItemMatches = xml.match(/<qti-assessment-item[\s>]/g);
  const hasMultipleItems = assessmentItemMatches && assessmentItemMatches.length > 1;
  
  if (hasMultipleItems) {
    // Wrap multiple items in a temporary container
    xmlToParse = `<items>${xml}</items>`;
  }
  
  const doc = new DOMParser().parseFromString(xmlToParse, 'application/xml');
  const serializer = new XMLSerializer();
  
  // Check for parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.error('XML parsing error:', parseError.textContent);
    throw new Error('Failed to parse XML: ' + parseError.textContent);
  }
  
  if (hasMultipleItems) {
    // Extract qti-item-body from each assessment item and join with dividers
    const assessmentItems = doc.querySelectorAll('qti-assessment-item');
    const htmlParts: string[] = [];
    
    assessmentItems.forEach((item, index) => {
      const itemBody = item.querySelector('qti-item-body');
      if (itemBody) {
        // Add divider before each item except the first
        if (index > 0) {
          htmlParts.push('<qti-item-divider></qti-item-divider>');
        }
        
        // Add the item body content
        const content = Array.from(itemBody.childNodes)
          .map(node => serializer.serializeToString(node))
          .join('');
        htmlParts.push(cleanEmptyNamespaces(content));
      }
    });
    
    return htmlParts.join('');
  } else {
    // Single item - use original logic
    const itemBody = doc.querySelector('qti-item-body') ?? doc.documentElement;
    const content = Array.from(itemBody.childNodes)
      .map(node => serializer.serializeToString(node))
      .join('');
    return cleanEmptyNamespaces(content);
  }
}
