/**
 * QTI ↔ ProseMirror roundtrip — composed in the app.
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

import { Schema, type Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, type Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { nodes, marks } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
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
import { blockSelectPlugin, attributesPanelPlugin } from '@qti-editor/prosemirror-plugins';
import { choiceInteractionDescriptor } from '@qti-editor/interaction-choice';
import { extendedTextInteractionDescriptor } from '@qti-editor/interaction-extended-text';
import { textEntryInteractionDescriptor } from '@qti-editor/interaction-text-entry';
import { qtiRubricBlockDescriptor } from '@qti-editor/qti-rubric-block';

import { qtiTransformItem } from '@qti-components/transformers';

// Register the interaction edit elements (custom elements used by the views).
import '@qti-editor/interaction-choice/register.js';
import '@qti-editor/interaction-extended-text/register.js';
import '@qti-editor/interaction-text-entry/register.js';
import '@qti-editor/interaction-shared/components/qti-prompt/register.js';
import '@qti-editor/interaction-shared/components/qti-simple-choice/register.js';

import 'prosemirror-view/style/prosemirror.css';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

/** Every descriptor this minimal editor understands. */
const descriptors = [
  choiceInteractionDescriptor,
  extendedTextInteractionDescriptor,
  textEntryInteractionDescriptor,
  qtiRubricBlockDescriptor
] satisfies InteractionDescriptor[];

const qtiNodes = Object.fromEntries(
  descriptors.flatMap(descriptor => descriptor.nodeSpecs).map(({ name, spec }) => [name, spec])
);

const baseNodes = { ...nodes, ...qtiNodes };

/** The editor schema: basic prose nodes + the QTI interaction node specs. */
export const schema = new Schema({
  nodes: {
    ...baseNodes,
    doc: {
      ...baseNodes.doc,
      // identifier/title are supplied from the imported item.
      attrs: { identifier: {}, title: {} }
    }
  },
  marks
});

/** Editable-attribute allowlist for the panel, keyed by node type. */
const editableAttrs = Object.fromEntries(
  descriptors.flatMap(descriptor =>
    Object.values(descriptor.attributePanelMetadata ?? {}).map(metadata => [
      metadata.nodeTypeName,
      metadata.editableAttributes ?? []
    ])
  )
);

/** Enter inserts a new sibling choice; falls back to the base behaviour elsewhere. */
const enterCommand = choiceInteractionDescriptor.enterCommand ?? baseKeymap.Enter;

const editorPlugins: Plugin[] = [
  keymap({ Enter: enterCommand }),
  keymap(baseKeymap),
  ...descriptors.flatMap(descriptor => descriptor.pluginFactories?.map(factory => factory()) ?? []),
  blockSelectPlugin
];

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

/** Mount an editor for `doc` into `container`, wiring the attributes panel into `panelEl`. */
export function mountEditor(container: HTMLElement, doc: ProseMirrorNode, panelEl: HTMLElement): EditorView {
  const view = new EditorView(container, {
    state: EditorState.create({
      doc,
      plugins: [...editorPlugins, attributesPanelPlugin(panelEl, { editableAttrs })]
    }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });
  return view;
}
