/**
 * ProseMirror → QTI 3.0 item export.
 *
 * Composes the `@citolab/prose-qti/components/shared` serializer (`pmToRoundtripXml`,
 * which emits a `<qti-item-body>` with canonical authoring attributes) with the
 * `@qti-editor/core` composer (`buildSingleAssessmentItemXml`, which expands the
 * item-body into a complete `<qti-assessment-item>` — deriving response
 * declarations / response processing from the canonical attributes).
 *
 * The schema is always supplied by the caller (it is editor-specific). The
 * `context` defaults `identifier` / `title` from the document's own attributes.
 */

import { pmToRoundtripXml } from '@citolab/prose-qti/components/shared';
import { buildSingleAssessmentItemXml, formatXml } from '../core/composer';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

export interface RoundtripExportContext {
  identifier: string;
  title: string;
  lang?: string;
}

/** Resolve the export context, defaulting `identifier` / `title` from the doc attrs. */
function resolveContext(doc: ProseMirrorNode, context?: Partial<RoundtripExportContext>): RoundtripExportContext {
  return {
    identifier: context?.identifier ?? (doc.attrs.identifier as string),
    title: context?.title ?? (doc.attrs.title as string),
    lang: context?.lang,
  };
}

/**
 * Export a ProseMirror document to a complete QTI 3.0 assessment item, parsed
 * as an XML `Document`. This is the editor's "save" output in document form.
 */
export function exportItemXmlDoc(
  doc: ProseMirrorNode,
  schema: Schema,
  context?: Partial<RoundtripExportContext>,
): XMLDocument {
  const resolved = resolveContext(doc, context);
  const itemBodyXml = pmToRoundtripXml(doc, resolved, schema);
  const itemBodyDoc = new DOMParser().parseFromString(itemBodyXml, 'application/xml');
  const xml = buildSingleAssessmentItemXml({ ...resolved, itemBody: itemBodyDoc });
  return new DOMParser().parseFromString(xml, 'application/xml');
}

export interface RoundtripExportXmlOptions {
  /** Pretty-print the output with 2-space indentation. Defaults to `true`. */
  format?: boolean;
}

/** Export a ProseMirror document to a complete QTI 3.0 assessment item XML string. */
export function exportItemXml(
  doc: ProseMirrorNode,
  schema: Schema,
  context?: Partial<RoundtripExportContext>,
  options: RoundtripExportXmlOptions = {},
): string {
  const resolved = resolveContext(doc, context);
  const itemBodyXml = pmToRoundtripXml(doc, resolved, schema);
  const itemBodyDoc = new DOMParser().parseFromString(itemBodyXml, 'application/xml');
  const xml = buildSingleAssessmentItemXml({ ...resolved, itemBody: itemBodyDoc });
  return options.format === false ? xml : formatXml(xml);
}
