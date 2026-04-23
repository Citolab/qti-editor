import { qtiFromNode } from '@qti-editor/prosekit-integration';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export interface ExportXmlOptions {
  node: ProseMirrorNode;
  identifier?: string;
  lang?: string;
  title?: string;
  fileName?: string;
}

/**
 * Export a ProseMirror document as QTI XML file
 */
export function exportXml(options: ExportXmlOptions): void {
  const safeFileName = (options.fileName || 'item')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '') || 'item';

  let xml = qtiFromNode(options.node, {
    identifier: options.identifier,
    lang: options.lang,
    title: options.title,
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
