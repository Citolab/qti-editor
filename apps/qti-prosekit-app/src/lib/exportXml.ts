import { qtiItemFromProsemirror, xmlFromNode } from './qti-export.js';
import { createQtiPackageFromNode } from '../components/package-builder/index.js';

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

/** A picked JSON file: the parsed value, and the name to report it under. */
export interface PickedJsonFile {
  value: unknown;
  fileName: string;
}

/**
 * Picks a JSON file and parses it. Does *not* build a document from it.
 *
 * It used to do both, with `schema.nodeFromJSON` inline — which throws on any node type the schema
 * does not have, so importing a document written by an older schema failed whole rather than
 * partially, and the caller could only show "Failed to import JSON file". The same content restored
 * from localStorage would have been migrated and salvaged. There is no reason the file-picker path
 * should be the harsher one, so the parsing stops here and the compatibility pipeline takes it from
 * the caller.
 */
export function pickJsonFile(): Promise<PickedJsonFile> {
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
          resolve({ value: JSON.parse(reader.result as string), fileName: file.name });
        } catch {
          reject(new Error('Invalid JSON'));
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
