/**
 * QTI ↔ ProseMirror roundtrip service — app facade.
 *
 * The import/export pipeline lives in `@qti-editor/qti-item-roundtrip`; this
 * module binds it to the app's editor `schema` and keeps the app-stable
 * `importQTI` / `exportQTI` names and signatures. To splice in app-specific
 * conversions, pass `options.transforms` (a reordered/extended transform list)
 * to the import helper, or post-process the exported XML string.
 *
 * Supported interactions: choice, extended-text, text-entry (+ rubric block).
 */

import { exportItemXml, importItemFromString } from '@qti-editor/qti-item-roundtrip';

import { schema } from '../editor/schema.js';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Import a QTI 3.0 item XML string into a ProseMirror document.
 *
 * `assetBasePath` rewrites relative asset URLs (e.g. `<img src>`) to an
 * absolute path so they resolve at runtime.
 */
export function importQTI(xml: string, assetBasePath = '/qti/kennisnet'): ProseMirrorNode {
  return importItemFromString(xml, schema, { assetBasePath });
}

/** Export a ProseMirror document back to a complete QTI 3.0 assessment item XML string. */
export function exportQTI(doc: ProseMirrorNode): string {
  return exportItemXml(doc, schema);
}
