import { qtiItemFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-item';
import { qtiTestFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-test';
import { xmlFromNode } from '@qti-editor/prosekit-integration/save-xml';
import { createQtiPackageFromNode } from '@qti-editor/qti-package';

import type { Schema } from 'prosekit/pm/model';
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

  let xml = qtiTestFromProsemirror(options.node, {
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

export function exportJson(node: ProseMirrorNode, fileName: string = 'item'): void {
  const safeFileName = fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
  const json = JSON.stringify(node.toJSON(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJson(schema: Schema): Promise<ProseMirrorNode> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          resolve(schema.nodeFromJSON(json));
        } catch {
          reject(new Error('Invalid ProseMirror JSON'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

export function exportItem(options: ExportXmlOptions): void {
  const safeFileName = (options.fileName || 'item')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '') || 'item';

  const xml = qtiItemFromProsemirror(options.node, {
    identifier: options.items?.[0]?.identifier,
    lang: options.lang,
    title: options.items?.[0]?.title,
  });

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRoundtripXml(node: ProseMirrorNode, fileName: string = 'item'): void {
  const safeFileName = fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
  const xml = xmlFromNode(node);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName}.roundtrip.xml`;
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
