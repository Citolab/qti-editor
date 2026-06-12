/**
 * QTI ↔ ProseMirror roundtrip service — composed in the app.
 *
 * The import/export pipeline is assembled here (not hidden behind a single
 * package helper) so a consuming app can splice in its own conversions: insert
 * extra `.fn(...)` transform steps in `importQTI`, or post-process the exported
 * XML in `exportQTI`.
 *
 *   QTI 3.0 item XML
 *     → qtiTransformItem().parse        (parse the raw XML)
 *     → roundtrip* transforms           (hoist correct-response/score, etc.)
 *     → reduceToItemBody                (reduce document to <qti-item-body>)
 *     → roundtripXmlToPm                (build the ProseMirror document)
 *
 *   ProseMirror document
 *     → pmToRoundtripXml                (serialize back to <qti-item-body>)
 *     → buildSingleAssessmentItemXml    (compose the full assessment item)
 *
 * Supported interactions: choice, extended-text, text-entry (+ rubric block).
 */

import {
  roundtripChoice,
  roundtripExtendedText,
  roundtripTextEntry,
  roundtripInteractions,
  roundtripItemBody,
  reduceToItemBody
} from '@qti-editor/qti3-item-import';
import { roundtripXmlToPm } from '@qti-editor/interaction-shared/roundtrip-xml-to-pm.js';
import { pmToRoundtripXml } from '@qti-editor/interaction-shared/pm-to-roundtrip-xml.js';
import { buildSingleAssessmentItemXml, formatXml } from '@qti-editor/core/composer';

import { qtiTransformItem } from '@qti-components/transformers';

import { schema } from '../editor/schema.js';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Import a QTI 3.0 item XML string into a ProseMirror document.
 *
 * `assetBasePath` rewrites relative asset URLs (e.g. `<img src>`) to an
 * absolute path so they resolve at runtime. Insert additional `.fn(...)` steps
 * here to apply your own conversions before the document is built.
 */
export function importQTI(xml: string, assetBasePath = '/qti/kennisnet'): ProseMirrorNode {
  const itemBody = qtiTransformItem()
    .parse(xml)
    .path(assetBasePath)
    .fn(roundtripChoice)
    .fn(roundtripTextEntry)
    .fn(roundtripExtendedText)
    .fn(roundtripInteractions)
    .fn(roundtripItemBody)
    .fn(reduceToItemBody)
    .xmlDoc();
  return roundtripXmlToPm(itemBody, schema);
}

/** Export a ProseMirror document back to a complete QTI 3.0 assessment item XML string. */
export function exportQTI(doc: ProseMirrorNode): string {
  const context = {
    identifier: doc.attrs.identifier as string,
    title: doc.attrs.title as string
  };
  const itemBodyXml = pmToRoundtripXml(doc, context, schema);
  const itemBodyDoc = new DOMParser().parseFromString(itemBodyXml, 'application/xml');
  return formatXml(buildSingleAssessmentItemXml({ ...context, itemBody: itemBodyDoc }));
}
