import { qtiItemFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-item';
import { xmlFromNode } from '@qti-editor/prosekit-integration/save-xml';
import { createQtiPackageFromNode } from '@qti-editor/qti-package-builder';
import { CURRENT_SCHEMA_VERSION } from '@qti-editor/interfaces';

import type { Schema } from 'prosekit/pm/model';
import type { ProseMirrorNode } from 'prosekit/pm/model';

export interface ExportXmlOptions {
  node: ProseMirrorNode;
  lang?: string;
  items?: Array<{ identifier?: string; title?: string }>;
  fileName?: string;
}

export interface ExportPackageOptions extends ExportXmlOptions {}

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
  const xml = xmlFromNode(node, undefined, {
    'data-schema-version': String(CURRENT_SCHEMA_VERSION),
  });
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
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
