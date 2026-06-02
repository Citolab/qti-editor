/**
 * QTI 3.0 CONTENT PACKAGE (.zip) BUILDER.
 *
 * Assembles a QTI 3.0 IMS content package: `imsmanifest.xml`, `assessment-test.xml`,
 * per-item XML under `items/`, and materialized image assets under `assets/`. Items
 * are produced by `@qti-editor/qti-test-export` (`getQtiItems`).
 *
 * Paired with `@qti-editor/qti-roundtrip-import` for the lossless authoring
 * roundtrip: this builder writes `data-*` mirror attributes onto interaction tags
 * (via `preserveEditorDataAttributes`) that the import side rehydrates. Both halves
 * must agree on the `data-*` attribute table in ROUNDTRIP.md.
 *
 * DO NOT:
 *   - Stop writing the `data-*` mirrors. They are the only thing the import side
 *     reads — `qti-response-declaration` / `qti-response-processing` are emitted
 *     for QTI conformance but ignored on re-import on purpose.
 *   - Add a `data-*` mapping here without adding its inverse in the import package.
 *   - Generalize this for third-party QTI consumers. That belongs in a separate package.
 *
 * If you need to break these rules, stop and read ROUNDTRIP.md, then update it.
 */
import JSZip from 'jszip';
import { collectMirrorMappings } from '@qti-editor/core/composer';
import { getInteractionComposerMetadata } from '@qti-editor/core/interactions/composer';

import { getQtiItems, type QtiComposeContext, type QtiItemFragment } from '@qti-editor/qti-test-export';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';


const QTI_PACKAGE_NS = 'http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p1';
const QTI_ASI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const QTI_PACKAGE_SCHEMA_LOCATION =
  'http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p1 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd';
const QTI_ASI_SCHEMA_LOCATION =
  'http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd';

const IMAGE_REFERENCE_ATTRIBUTES = ['src', 'data', 'image'] as const;

export interface QtiPackageContext extends QtiComposeContext {
  packageIdentifier?: string;
  testIdentifier?: string;
  testTitle?: string;
  sectionIdentifier?: string;
  sectionTitle?: string;
}

export interface QtiPackageOptions {
  /**
   * Override resource loading for non-data image references. The default uses fetch when available.
   */
  fetchResource?: (href: string) => Promise<Blob | ArrayBuffer | Uint8Array | null | undefined>;
}

export interface QtiPackageItem {
  identifier: string;
  title?: string;
  xml: string;
}

interface PackageItemResource {
  identifier: string;
  title: string;
  href: string;
  xml: string;
  dependencies: string[];
  informational: boolean;
}

interface AssetResource {
  identifier: string;
  href: string;
  data: Blob | Uint8Array;
}

interface MaterializeState {
  assetIndex: number;
  assets: AssetResource[];
}

export async function createQtiPackageFromNode(
  node: ProseMirrorNode,
  context: QtiPackageContext = {},
  options: QtiPackageOptions = {},
): Promise<Blob> {
  const items = getQtiItems(node, context).map(item => ({
    identifier: item.identifier,
    title: item.title,
    xml: item.formattedXml || item.xml,
  }));

  return createQtiPackageFromItems(items, context, options);
}

export async function createQtiPackageFromProseMirrorJson(
  json: unknown,
  schema: Schema,
  context: QtiPackageContext = {},
  options: QtiPackageOptions = {},
): Promise<Blob> {
  const node = schema.nodeFromJSON(json) as ProseMirrorNode;
  return createQtiPackageFromNode(node, context, options);
}

export async function createQtiPackageFromItems(
  items: QtiPackageItem[] | QtiItemFragment[],
  context: QtiPackageContext = {},
  options: QtiPackageOptions = {},
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error('Cannot create a QTI package without at least one item.');
  }

  const packageIdentifier = sanitizeIdentifier(context.packageIdentifier || context.identifier || 'qti-package', 'qti-package');
  const testIdentifier = sanitizeIdentifier(context.testIdentifier || `${packageIdentifier}-test`, `${packageIdentifier}-test`);
  const testTitle = escapeXml(context.testTitle || context.title || 'QTI Package');
  const sectionIdentifier = sanitizeIdentifier(context.sectionIdentifier || 'section-1', 'section-1');
  const sectionTitle = escapeXml(context.sectionTitle || 'Section 1');
  const materializeState: MaterializeState = { assetIndex: 0, assets: [] };
  const usedItemHrefs = new Set<string>();
  const usedItemIdentifiers = new Set<string>();

  const itemResources: PackageItemResource[] = [];
  for (const item of items) {
    const sanitized = sanitizeIdentifier(item.identifier, 'item');
    const identifier = uniqueIdentifier(sanitized, usedItemIdentifiers);
    usedItemIdentifiers.add(identifier);

    const itemFileBase = uniqueFileBase(identifier, usedItemHrefs);
    const materialized = await materializeImageReferences(
      item.xml,
      itemFileBase,
      materializeState,
      options,
    );

    itemResources.push({
      identifier,
      title: item.title || identifier,
      href: `items/${itemFileBase}.xml`,
      xml: materialized.xml,
      dependencies: materialized.assetHrefs,
      informational: !hasAnyInteraction(materialized.xml),
    });
  }

  const zip = new JSZip();
  zip.file('imsmanifest.xml', renderManifest({
    manifestIdentifier: `${packageIdentifier}-manifest`,
    testIdentifier,
    itemResources,
    assets: materializeState.assets,
  }));
  zip.file('assessment-test.xml', renderAssessmentTest({
    testIdentifier,
    testTitle,
    sectionIdentifier,
    sectionTitle,
    itemResources,
  }));

  itemResources.forEach(item => {
    zip.file(item.href, item.xml);
  });
  materializeState.assets.forEach(asset => {
    zip.file(asset.href, asset.data);
  });

  return zip.generateAsync({ type: 'blob' });
}

function renderManifest(options: {
  manifestIdentifier: string;
  testIdentifier: string;
  itemResources: PackageItemResource[];
  assets: AssetResource[];
}): string {
  const itemDependencies = options.itemResources
    .map(item => `      <dependency identifierref="${escapeXml(item.identifier)}"/>`)
    .join('\n');

  const itemResources = options.itemResources.map(item => {
    const dependencies = item.dependencies
      .map(assetHref => `      <dependency identifierref="${assetIdentifierFromHref(assetHref)}"/>`)
      .join('\n');

    return `    <resource identifier="${escapeXml(item.identifier)}" type="imsqti_item_xmlv3p0" href="${escapeXml(item.href)}">
      <file href="${escapeXml(item.href)}"/>
${dependencies}
    </resource>`;
  }).join('\n');

  const assetResources = options.assets.map(asset => `    <resource identifier="${escapeXml(asset.identifier)}" type="associatedcontent/learning-application-resource" href="${escapeXml(asset.href)}">
      <file href="${escapeXml(asset.href)}"/>
    </resource>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="${QTI_PACKAGE_NS}" xmlns:xsi="${XSI_NS}" xsi:schemaLocation="${QTI_PACKAGE_SCHEMA_LOCATION}" identifier="${escapeXml(options.manifestIdentifier)}">
  <metadata>
    <schema>QTI Package</schema>
    <schemaversion>3.0.0</schemaversion>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="${escapeXml(options.testIdentifier)}" type="imsqti_test_xmlv3p0" href="assessment-test.xml">
      <file href="assessment-test.xml"/>
${itemDependencies}
    </resource>
${itemResources}
${assetResources}
  </resources>
</manifest>`;
}

function renderAssessmentTest(options: {
  testIdentifier: string;
  testTitle: string;
  sectionIdentifier: string;
  sectionTitle: string;
  itemResources: PackageItemResource[];
}): string {
  const refs = options.itemResources.map(item => {
    const category = item.informational ? ` category="dep-informational"` : '';
    return `      <qti-assessment-item-ref identifier="${escapeXml(item.identifier)}" href="${escapeXml(item.href)}"${category}/>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="${QTI_ASI_NS}" xmlns:xsi="${XSI_NS}" xsi:schemaLocation="${QTI_ASI_SCHEMA_LOCATION}" identifier="${escapeXml(options.testIdentifier)}" title="${options.testTitle}">
  <qti-test-part identifier="test-part-1" navigation-mode="nonlinear" submission-mode="simultaneous">
    <qti-assessment-section identifier="${escapeXml(options.sectionIdentifier)}" title="${options.sectionTitle}" visible="true">
${refs}
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>`;
}

async function materializeImageReferences(
  xml: string,
  itemFileBase: string,
  state: MaterializeState,
  options: QtiPackageOptions,
): Promise<{ xml: string; assetHrefs: string[] }> {
  const assetHrefs: string[] = [];
  const replacements = new Map<string, string>();
  const cleanedXml = preserveEditorDataAttributes(cleanXmlString(xml));
  const attributePattern = new RegExp(`\\b(${IMAGE_REFERENCE_ATTRIBUTES.join('|')})="([^"]+)"`, 'gi');
  const matches = [...cleanedXml.matchAll(attributePattern)];

  for (const match of matches) {
    const originalValue = match[2];
    if (replacements.has(originalValue)) continue;

    const asset = await createAssetFromReference(originalValue, itemFileBase, state, options);
    if (!asset) continue;

    state.assets.push(asset);
    assetHrefs.push(asset.href);
    replacements.set(originalValue, `../${asset.href}`);
  }

  let rewrittenXml = cleanedXml;
  replacements.forEach((replacement, originalValue) => {
    rewrittenXml = replaceAll(rewrittenXml, `"${originalValue}"`, `"${escapeAttributeValue(replacement)}"`);
  });

  return { xml: rewrittenXml, assetHrefs };
}

// Mirrors ProseMirror authoring attributes onto QTI interaction tags as `data-*`
// attributes. This is the *write* half of the lossless roundtrip — the import
// package strips `qti-response-*` nodes and rehydrates schema attrs from these
// mirrors. Do not remove without coordinating with the import side.
function preserveEditorDataAttributes(xml: string): string {
  return xml.replace(/<(?<tagName>qti-[a-z0-9-]+-interaction)\b(?<attributes>[^<>]*)>/gi, (match, tagName: string, attributes: string) => {
    const isSelfClosing = match.endsWith('/>') || /\/\s*$/.test(attributes);
    const baseAttributes = isSelfClosing ? attributes.replace(/\/\s*$/, '') : attributes;
    const nextAttributes = preserveEditorDataAttributesInTag(tagName.toLowerCase(), baseAttributes);
    return `<${tagName}${nextAttributes}${isSelfClosing ? ' />' : '>'}`;
  });
}

function preserveEditorDataAttributesInTag(tagName: string, attributes: string): string {
  const metadata = getInteractionComposerMetadata(tagName);
  const mappings = metadata ? collectMirrorMappings(metadata) : [];

  let nextAttributes = attributes;
  mappings.forEach(({ source, target }) => {
    const value = findAttributeValue(attributes, source);
    if (value == null || value.length === 0 || hasAttribute(nextAttributes, target)) return;
    nextAttributes += ` ${target}="${escapePreservedAttributeValue(value)}"`;
  });

  return nextAttributes;
}

function findAttributeValue(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`(?:^|\\s)${escapeRegExp(name)}=(["'])(.*?)\\1`));
  return match?.[2] ?? null;
}

function hasAttribute(attributes: string, name: string): boolean {
  return new RegExp(`(?:^|\\s)${escapeRegExp(name)}=`).test(attributes);
}

function escapePreservedAttributeValue(value: string): string {
  return value.replace(/"/g, '&quot;');
}

async function createAssetFromReference(
  reference: string,
  itemFileBase: string,
  state: MaterializeState,
  options: QtiPackageOptions,
): Promise<AssetResource | null> {
  if (reference.startsWith('data:image/')) {
    const dataUri = parseImageDataUri(reference);
    if (!dataUri) return null;

    const href = nextAssetHref(itemFileBase, state, dataUri.extension);
    return {
      identifier: assetIdentifierFromHref(href),
      href,
      data: dataUri.data,
    };
  }

  const fetched = await fetchImageReference(reference, options);
  if (!fetched) return null;

  const href = nextAssetHref(itemFileBase, state, fetched.extension);
  return {
    identifier: assetIdentifierFromHref(href),
    href,
    data: fetched.data,
  };
}

function parseImageDataUri(reference: string): { extension: string; data: Uint8Array } | null {
  const match = reference.match(/^data:(image\/[a-zA-Z0-9.+-]+)(;base64)?,(.*)$/);
  if (!match) return null;

  const mimeType = match[1];
  const isBase64 = Boolean(match[2]);
  const payload = match[3];
  const binary = isBase64 ? atobCompatible(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    extension: extensionFromMimeType(mimeType),
    data: bytes,
  };
}

async function fetchImageReference(
  reference: string,
  options: QtiPackageOptions,
): Promise<{ extension: string; data: Blob | Uint8Array } | null> {
  if (reference.startsWith('#') || reference.startsWith('mailto:')) return null;

  try {
    const resource = options.fetchResource ? await options.fetchResource(reference) : await defaultFetchResource(reference);
    if (!resource) return null;

    if (resource instanceof Blob) {
      const mimeType = resource.type || mimeTypeFromPath(reference);
      if (!isImageMimeType(mimeType) && !hasImageExtension(reference)) return null;
      return {
        extension: extensionFromMimeType(mimeType || 'image/png', reference),
        data: resource,
      };
    }

    const bytes = resource instanceof Uint8Array ? resource : new Uint8Array(resource);
    return {
      extension: extensionFromMimeType(mimeTypeFromPath(reference) || 'image/png', reference),
      data: bytes,
    };
  } catch {
    return null;
  }
}

async function defaultFetchResource(reference: string): Promise<Blob | null> {
  if (typeof fetch !== 'function') return null;
  const response = await fetch(reference);
  if (!response.ok) return null;
  return response.blob();
}

function nextAssetHref(itemFileBase: string, state: MaterializeState, extension: string): string {
  state.assetIndex += 1;
  return `assets/${itemFileBase}-image-${state.assetIndex}.${extension}`;
}

function uniqueIdentifier(identifier: string, used: Set<string>): string {
  if (!used.has(identifier)) return identifier;
  let n = 2;
  while (used.has(`${identifier}-${n}`)) n++;
  return `${identifier}-${n}`;
}

function uniqueFileBase(identifier: string, used: Set<string>): string {
  const base = sanitizeFileName(identifier, 'item');
  let candidate = base;
  let index = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  used.add(candidate);
  return candidate;
}

function sanitizeIdentifier(value: string, fallback: string): string {
  return value.trim().replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function sanitizeFileName(value: string, fallback: string): string {
  return sanitizeIdentifier(value, fallback).replace(/[.]+$/g, '') || fallback;
}

function assetIdentifierFromHref(href: string): string {
  return `asset-${sanitizeIdentifier(href.replace(/^assets\//, '').replace(/\.[^.]+$/, ''), 'image')}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeAttributeValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function atobCompatible(value: string): string {
  if (typeof atob === 'function') return atob(value);
  return Buffer.from(value, 'base64').toString('binary');
}

function isImageMimeType(mimeType?: string): boolean {
  return Boolean(mimeType?.startsWith('image/'));
}

function extensionFromMimeType(mimeType: string, fallbackPath?: string): string {
  const extension = mimeType.split('/')[1]?.split(';')[0]?.replace('svg+xml', 'svg');
  if (extension) return extension;
  return extensionFromPath(fallbackPath) || 'png';
}

function mimeTypeFromPath(path?: string): string {
  const extension = extensionFromPath(path);
  if (!extension) return '';
  if (extension === 'svg') return 'image/svg+xml';
  return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
}

function extensionFromPath(path?: string): string | null {
  const match = path?.split('?')[0]?.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? null;
}

function hasImageExtension(path: string): boolean {
  return ['gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(extensionFromPath(path) || '');
}

function replaceAll(value: string, search: string, replacement: string): string {
  return value.split(search).join(replacement);
}

function hasAnyInteraction(xml: string): boolean {
  return /<qti-[a-z0-9-]+-interaction\b/i.test(xml);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanXmlString(xmlString: string): string {
  if (!xmlString) return xmlString;

  const xmlDeclaration = /<\?xml.*?\?>/;
  const match = xmlString.match(xmlDeclaration);
  const withoutBomEntity = (value: string) => value.replace('&#xfeff;', '');

  if (match?.index !== undefined) {
    return withoutBomEntity(xmlString.slice(match.index));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${withoutBomEntity(xmlString)}`;
}
