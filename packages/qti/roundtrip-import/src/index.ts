/**
 * LOSSLESS QTI→PROSEMIRROR ROUNDTRIP — NOT A GENERIC QTI 3.0 IMPORTER.
 *
 * Paired with `@qti-editor/qti-roundtrip-export`. This importer ONLY restores
 * items the export package wrote, because it deliberately strips
 * `qti-response-declaration` and `qti-response-processing` and rehydrates
 * authoring attributes from the `data-*` mirrors instead. Third-party QTI 3.0
 * packages will import with empty correct-response / scoring data — by design.
 *
 * DO NOT:
 *   - Make this read `qti-response-declaration` / `qti-response-processing` as a
 *     source of authoring state. They are intentionally ignored.
 *   - Add a `data-*` mapping here without adding its sibling in the export package.
 *   - Generalize this for third-party QTI input. That belongs in a separate package
 *     (the names `@qti-editor/qti-export` / `qti-import` are reserved for it).
 *
 * If you need to break these rules, stop and read ROUNDTRIP.md, then update it.
 */
import JSZip from 'jszip';
import { xmlToHTML } from '@qti-editor/prosekit-integration';
import { jsonFromHTML } from 'prosekit/core';

import type { Schema } from 'prosekit/pm/model';

const ITEM_RESOURCE_TYPE = 'imsqti_item_xmlv3p0';
const ASSESSMENT_TEST_FILE = 'assessment-test.xml';
const MANIFEST_FILE = 'imsmanifest.xml';
const IMAGE_REFERENCE_ATTRIBUTES = ['src', 'data', 'image'] as const;

// PAIRED CONTRACT: every entry below must have a forward mapping in
// `EDITOR_DATA_ATTRIBUTE_MAPPINGS` (or its per-interaction siblings) inside
// `@qti-editor/qti-roundtrip-export` (`packages/qti/roundtrip-export/src/index.ts`).
// See ROUNDTRIP.md for the canonical table.
export const DATA_ATTRIBUTE_MAPPINGS = [
  { source: 'data-correct-response', target: 'correct-response' },
  { source: 'data-score', target: 'score' },
  { source: 'data-case-sensitive', target: 'case-sensitive' },
  { source: 'data-area-mappings', target: 'area-mappings' },
] as const;

type ProseMirrorJson = ReturnType<typeof jsonFromHTML>;

export interface QtiPackageImportOptions {
  schema: Schema;
}

export interface QtiPackageImportItemMetadata {
  identifier?: string;
  title?: string;
  href: string;
}

export interface QtiPackageImportMetadata {
  identifier?: string;
  title?: string;
  items: QtiPackageImportItemMetadata[];
}

export interface QtiPackageImportResult {
  json: ProseMirrorJson;
  metadata: QtiPackageImportMetadata;
}

export async function importQtiPackageFromBlob(
  blob: Blob,
  options: QtiPackageImportOptions,
): Promise<QtiPackageImportResult> {
  return importQtiPackageFromArrayBuffer(await blob.arrayBuffer(), options);
}

export async function importQtiPackageFromArrayBuffer(
  buffer: ArrayBuffer | Uint8Array,
  options: QtiPackageImportOptions,
): Promise<QtiPackageImportResult> {
  const zip = await JSZip.loadAsync(buffer);
  return importQtiPackageFromZip(zip, options);
}

export async function importQtiPackageFromZip(
  zip: JSZip,
  options: QtiPackageImportOptions,
): Promise<QtiPackageImportResult> {
  const itemHrefs = await getOrderedItemHrefs(zip);
  if (itemHrefs.length === 0) {
    throw new Error('QTI package does not contain any item XML resources.');
  }

  const itemJson: ProseMirrorJson[] = [];
  const itemMetadata: QtiPackageImportItemMetadata[] = [];

  for (const href of itemHrefs) {
    const file = zip.file(href);
    if (!file) continue;

    const rawXml = await file.async('string');
    const xml = await inlineImageReferences(rawXml, href, zip);
    const metadata = extractItemMetadata(xml);
    const html = itemXmlToImportHtml(xml);
    itemJson.push(jsonFromHTML(html, { schema: options.schema }));
    itemMetadata.push({ ...metadata, href });
  }

  if (itemJson.length === 0) {
    throw new Error('QTI package item resources could not be read.');
  }

  return {
    json: mergeItemJson(itemJson, options.schema),
    metadata: {
      ...await extractPackageMetadata(zip),
      items: itemMetadata,
    },
  };
}

export async function getOrderedItemHrefs(zip: JSZip): Promise<string[]> {
  const assessmentTest = await zip.file(ASSESSMENT_TEST_FILE)?.async('string');
  const manifest = await zip.file(MANIFEST_FILE)?.async('string');
  const manifestItemHrefs = manifest ? extractManifestItemHrefs(manifest) : [];
  const manifestHrefSet = new Set(manifestItemHrefs);

  if (assessmentTest) {
    const refs = extractAssessmentItemRefs(assessmentTest)
      .map(href => normalizeZipPath(resolveZipPath(ASSESSMENT_TEST_FILE, href)))
      .filter(href => zip.file(href) && (manifestHrefSet.size === 0 || manifestHrefSet.has(href)));

    if (refs.length > 0) return unique(refs);
  }

  if (manifestItemHrefs.length > 0) {
    return unique(manifestItemHrefs.filter(href => Boolean(zip.file(href))));
  }

  return zip.file(/\.xml$/i)
    .map(file => normalizeZipPath(file.name))
    .filter(name => name !== MANIFEST_FILE && name !== ASSESSMENT_TEST_FILE)
    .sort();
}

export function itemXmlToImportHtml(xml: string): string {
  return applyDataAttributes(xmlToHTML(stripIgnoredQtiSections(cleanXmlText(xml))));
}

export function applyDataAttributes(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');

  deduplicateResponseIdentifiers(document);

  Array.from(document.querySelectorAll('*')).forEach(element => {
    DATA_ATTRIBUTE_MAPPINGS.forEach(({ source, target }) => {
      const value = element.getAttribute(source);
      if (value == null) return;
      element.setAttribute(target, value);
    });
  });

  return document.body.innerHTML;
}

function deduplicateResponseIdentifiers(document: Document): void {
  const seen = new Set<string>();
  Array.from(document.querySelectorAll('[response-identifier]')).forEach(element => {
    const id = element.getAttribute('response-identifier');
    if (!id) return;
    if (seen.has(id)) {
      element.setAttribute('response-identifier', `RESPONSE_${crypto.randomUUID()}`);
    } else {
      seen.add(id);
    }
  });
}

function mergeItemJson(items: ProseMirrorJson[], schema: Schema): ProseMirrorJson {
  const [firstItem] = items;
  if (!firstItem || items.length === 1) return firstItem;

  const content: unknown[] = [];
  items.forEach((item, index) => {
    if (index > 0 && schema.nodes.qtiItemDivider) {
      content.push({ type: 'qtiItemDivider' });
    }

    const itemContent = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    content.push(...itemContent);
  });

  return { ...(firstItem as object), content } as ProseMirrorJson;
}

// Intentional, not a bug: this importer does NOT use `qti-response-declaration`
// or `qti-response-processing` as a source of authoring state. Authoring data is
// rehydrated from `data-*` mirrors written by the paired export package. Removing
// this strip would let response-processing nodes leak into ProseMirror.
function stripIgnoredQtiSections(xml: string): string {
  const document = parseXmlDocument(xml);
  document
    .querySelectorAll('qti-response-declaration, responseDeclaration, qti-response-processing, responseProcessing')
    .forEach(node => node.parentNode?.removeChild(node));

  stripGeneratedRubricBlocks(document);
  collapseInsignificantWhitespace(document);

  return new XMLSerializer().serializeToString(document);
}

// Pretty-printed QTI XML carries indentation/newline text nodes that ProseMirror
// renders as visible whitespace ("        Waarom..."). Collapse them the way an
// HTML parser would: runs of whitespace become a single space, and whitespace
// adjacent to block boundaries (between block elements or at the edges of one)
// is dropped entirely. Preserve `<pre>` content verbatim.
export function collapseInsignificantWhitespace(document: XMLDocument): void {
  if (!document.documentElement) return;
  collapseInsignificantWhitespaceIn(document.documentElement);
}

const INLINE_TAG_NAMES = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em',
  'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'img',
]);

function isInlineElement(element: Element): boolean {
  return INLINE_TAG_NAMES.has(element.localName.toLowerCase());
}

function collapseInsignificantWhitespaceIn(element: Element): void {
  const tag = element.localName.toLowerCase();
  if (tag === 'pre') return;

  const children = Array.from(element.childNodes);
  const isBlockContainer = !isInlineElement(element);

  children.forEach((child, index) => {
    if (child.nodeType === child.ELEMENT_NODE) {
      collapseInsignificantWhitespaceIn(child as Element);
      return;
    }
    if (child.nodeType !== child.TEXT_NODE) return;

    const original = child.nodeValue ?? '';
    let collapsed = original.replace(/[\t\n\r\f ]+/g, ' ');
    if (isBlockContainer) {
      const prev = children[index - 1];
      const next = children[index + 1];
      const atBlockBoundaryStart = !prev || (prev.nodeType === prev.ELEMENT_NODE && !isInlineElement(prev as Element));
      const atBlockBoundaryEnd = !next || (next.nodeType === next.ELEMENT_NODE && !isInlineElement(next as Element));
      if (atBlockBoundaryStart) collapsed = collapsed.replace(/^ +/, '');
      if (atBlockBoundaryEnd) collapsed = collapsed.replace(/ +$/, '');
    }

    if (collapsed.length === 0) {
      child.parentNode?.removeChild(child);
    } else if (collapsed !== original) {
      child.nodeValue = collapsed;
    }
  });
}

// The paired export package emits a `qti-rubric-block` sibling after every
// `qti-extended-text-interaction` whose `correct-response` is set, purely so
// QTI consumers see the model answer. On re-import we already rehydrate the
// authoring `correct-response` from `data-correct-response`, so leaving the
// rubric block in would duplicate the model answer below the interaction.

function stripGeneratedRubricBlocks(document: XMLDocument): void {
  document.querySelectorAll('qti-rubric-block').forEach(block => {
    if (block.getAttribute('view') === 'scorer' && block.getAttribute('use') === 'scoring') {
      block.parentNode?.removeChild(block);
    }
  });
}

function extractAssessmentItemRefs(xml: string): string[] {
  return findXmlTags(xml, ['qti-assessment-item-ref', 'assessmentItemRef'])
    .map(tag => readXmlAttribute(tag, 'href'))
    .filter((href): href is string => Boolean(href));
}

function extractManifestItemHrefs(xml: string): string[] {
  return findXmlTags(xml, ['resource'])
    .filter(tag => readXmlAttribute(tag, 'type') === ITEM_RESOURCE_TYPE)
    .map(tag => readXmlAttribute(tag, 'href'))
    .filter((href): href is string => Boolean(href))
    .map(href => normalizeZipPath(href));
}

async function extractPackageMetadata(zip: JSZip): Promise<{ identifier?: string; title?: string }> {
  const assessmentTest = await zip.file(ASSESSMENT_TEST_FILE)?.async('string');
  if (assessmentTest) {
    const document = parseXmlDocument(assessmentTest);
    const test = document.querySelector('qti-assessment-test, assessmentTest');
    if (test) {
      return {
        identifier: test.getAttribute('identifier') || undefined,
        title: test.getAttribute('title') || undefined,
      };
    }
  }

  const manifest = await zip.file(MANIFEST_FILE)?.async('string');
  if (!manifest) return {};
  const document = parseXmlDocument(manifest);
  return {
    identifier: document.documentElement?.getAttribute('identifier') || undefined,
  };
}

function extractItemMetadata(xml: string): { identifier?: string; title?: string } {
  const document = parseXmlDocument(cleanXmlText(xml));
  const item = document.querySelector('qti-assessment-item, assessmentItem');
  if (!item) return {};

  return {
    identifier: item.getAttribute('identifier') || undefined,
    title: item.getAttribute('title') || undefined,
  };
}

function parseXmlDocument(xml: string): XMLDocument {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = document.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Failed to parse QTI XML: ${parseError.textContent || 'unknown parser error'}`);
  }
  return document;
}

function cleanXmlText(xml: string): string {
  let cleaned = xml
    .replace(/^\uFEFF/, '')
    .replace(/^\u200B/, '')
    .replace(/^\u00A0/, '')
    .trim();

  const firstLtIndex = cleaned.indexOf('<');
  if (firstLtIndex > 0) cleaned = cleaned.substring(firstLtIndex);
  return cleaned;
}

function resolveZipPath(basePath: string, href: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/')) return href;

  const baseParts = basePath.split('/');
  baseParts.pop();

  href.split('/').forEach(part => {
    if (!part || part === '.') return;
    if (part === '..') {
      baseParts.pop();
      return;
    }
    baseParts.push(part);
  });

  return baseParts.join('/');
}

function normalizeZipPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').split(/[?#]/)[0] || path;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function inlineImageReferences(xml: string, itemHref: string, zip: JSZip): Promise<string> {
  const attributePattern = new RegExp(`\\b(${IMAGE_REFERENCE_ATTRIBUTES.join('|')})="([^"]+)"`, 'gi');
  const matches = [...xml.matchAll(attributePattern)];
  const replacements = new Map<string, string>();

  for (const match of matches) {
    const originalValue = match[2];
    if (replacements.has(originalValue)) continue;
    if (originalValue.startsWith('data:')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(originalValue)) continue;

    const assetPath = normalizeZipPath(resolveZipPath(itemHref, originalValue));
    const file = zip.file(assetPath);
    if (!file) continue;

    const base64 = await file.async('base64');
    const mimeType = mimeTypeFromPath(assetPath) || 'image/png';
    replacements.set(originalValue, `data:${mimeType};base64,${base64}`);
  }

  let rewritten = xml;
  replacements.forEach((replacement, originalValue) => {
    rewritten = rewritten.split(`"${originalValue}"`).join(`"${replacement}"`);
  });
  return rewritten;
}

function mimeTypeFromPath(path: string): string {
  const match = path.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  const extension = match?.[1]?.toLowerCase();
  if (!extension) return '';
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'jpg') return 'image/jpeg';
  return `image/${extension}`;
}

function findXmlTags(xml: string, tagNames: string[]): string[] {
  return tagNames.flatMap(tagName => {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
    return xml.match(pattern) ?? [];
  });
}

function readXmlAttribute(tag: string, attributeName: string): string | null {
  const match = tag.match(new RegExp(`\\s${attributeName}=(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? null;
}
