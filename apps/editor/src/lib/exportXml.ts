import { qtiFromNode } from '@qti-editor/prosekit-integration';
import { createQtiPackageFromNode } from '@qti-editor/qti-roundtrip-export';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export interface ExportXmlOptions {
  node: ProseMirrorNode;
  lang?: string;
  items?: Array<{ identifier?: string; title?: string; informational?: boolean }>;
  fileName?: string;
}

export interface ExportPackageOptions extends ExportXmlOptions {}

/**
 * Export a ProseMirror document as QTI XML file
 */
export function exportXml(options: ExportXmlOptions): void {
  const safeFileName = (options.fileName || 'item')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '') || 'item';

  let xml = qtiFromNode(options.node, {
    identifier: options.items?.[0]?.identifier,
    lang: options.lang,
    title: options.items?.[0]?.title,
    items: options.items,
  });

  // Clean XML: remove any BOM, zero-width spaces, or other invisible characters
  xml = xml
    .replace(/^\uFEFF/, '')  // BOM
    .replace(/^\u200B/g, '') // Zero-width space
    .replace(/^\u00A0/, '')  // Non-breaking space at start
    .replace(/\u200B/g, '')  // Zero-width spaces anywhere
    .trim();

  // Ensure proper XML start
  if (!xml.startsWith('<?xml') && !xml.startsWith('<')) {
    const firstLtIndex = xml.indexOf('<');
    if (firstLtIndex > 0) {
      xml = xml.substring(firstLtIndex);
    }
  }

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPackage(options: ExportPackageOptions): Promise<void> {
  const safeFileName = (options.fileName || 'item')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
  const item0 = options.items?.[0];

  const blob = await createQtiPackageFromNode(options.node, {
    lang: options.lang,
    items: options.items,
    packageIdentifier: safeFileName,
    testTitle: item0?.title || safeFileName,
    informationalItems: (options.items ?? []).map(item => item.informational ?? false),
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
