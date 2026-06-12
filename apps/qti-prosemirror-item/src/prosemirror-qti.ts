/**
 * QTI integration layer — everything that turns a plain ProseMirror editor into
 * a QTI item editor lives here. `main.ts` stays ProseMirror-only and consumes
 * this module's exports as its single QTI touchpoint.
 *
 * What this module contributes:
 * - `schema`: basic prose nodes/marks + the QTI interaction node specs, with the
 *   `doc` node carrying the item's `identifier`/`title`.
 * - `qtiPlugins`: the interaction descriptors' own ProseMirror plugins plus the
 *   choice-aware Enter keymap. Place these before `baseKeymap` when composing.
 * - `editableAttrs`: the per-node attribute allowlist for the attributes panel.
 * - `loadQtiItems` / `importQtiItem` / `exportQtiItem`: the QTI 3.0 roundtrip,
 *   pre-bound to this schema.
 *
 * It also carries the side-effect imports that register the QTI interaction edit
 * elements (custom elements used by the node views).
 *
 * Supported interactions: choice, extended-text, text-entry, associate,
 * gap-match, hottext, inline-choice, match, order, select-point (+ rubric block).
 */

import { Schema } from 'prosemirror-model';
import { nodes, marks } from 'prosemirror-schema-basic';
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { choiceInteractionDescriptor } from '@qti-editor/interaction-choice';
import { extendedTextInteractionDescriptor } from '@qti-editor/interaction-extended-text';
import { textEntryInteractionDescriptor } from '@qti-editor/interaction-text-entry';
import { associateInteractionDescriptor } from '@qti-editor/interaction-associate';
import { gapMatchInteractionDescriptor } from '@qti-editor/interaction-gap-match';
import { hottextInteractionDescriptor } from '@qti-editor/interaction-hottext';
import { inlineChoiceInteractionDescriptor } from '@qti-editor/interaction-inline-choice';
import { matchInteractionDescriptor } from '@qti-editor/interaction-match';
import { orderInteractionDescriptor } from '@qti-editor/interaction-order';
import { selectPointInteractionDescriptor } from '@qti-editor/interaction-select-point';
import { qtiRubricBlockDescriptor } from '@qti-editor/qti-rubric-block';
import { exportItemXml, importItemFromUrl } from '@qti-editor/qti-item-roundtrip';

import { qtiTransformTest } from '@qti-components/transformers';

// Register the interaction edit elements (custom elements used by the views).
import '@qti-editor/interaction-choice/register.js';
import '@qti-editor/interaction-extended-text/register.js';
import '@qti-editor/interaction-text-entry/register.js';
import '@qti-editor/interaction-associate/register.js';
import '@qti-editor/interaction-gap-match/register.js';
import '@qti-editor/interaction-hottext/register.js';
import '@qti-editor/interaction-inline-choice/register.js';
import '@qti-editor/interaction-match/register.js';
import '@qti-editor/interaction-order/register.js';
import '@qti-editor/interaction-select-point/register.js';
import '@qti-editor/interaction-shared/components/qti-prompt/register.js';
import '@qti-editor/interaction-shared/components/qti-simple-choice/register.js';
import '@qti-editor/interaction-shared/components/qti-simple-associable-choice/register.js';
import '@qti-editor/interaction-shared/components/qti-simple-match-set/register.js';
import '@qti-editor/interaction-shared/components/qti-gap/register.js';
import '@qti-editor/interaction-shared/components/qti-gap-text/register.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';

/** Every descriptor this minimal editor understands. */
const descriptors = [
  choiceInteractionDescriptor,
  extendedTextInteractionDescriptor,
  textEntryInteractionDescriptor,
  associateInteractionDescriptor,
  gapMatchInteractionDescriptor,
  hottextInteractionDescriptor,
  inlineChoiceInteractionDescriptor,
  matchInteractionDescriptor,
  orderInteractionDescriptor,
  selectPointInteractionDescriptor,
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
export const editableAttrs = Object.fromEntries(
  descriptors.flatMap(descriptor =>
    Object.values(descriptor.attributePanelMetadata ?? {}).map(metadata => [
      metadata.nodeTypeName,
      metadata.editableAttributes ?? []
    ])
  )
);

/** Enter inserts a new sibling choice; falls back to the base behaviour elsewhere. */
const enterCommand = choiceInteractionDescriptor.enterCommand ?? baseKeymap.Enter;

/**
 * QTI-specific plugins: the choice-aware Enter keymap plus each descriptor's own
 * plugins. Compose these *before* `keymap(baseKeymap)` so the Enter override wins.
 */
export const qtiPlugins: Plugin[] = [
  keymap({ Enter: enterCommand }),
  ...descriptors.flatMap(descriptor => descriptor.pluginFactories?.map(factory => factory()) ?? [])
];

const TEST_BASE = '/qti/kennisnet';

/** Load the Kennisnet sample item refs from `AssessmentTest.xml`. */
export async function loadQtiItems(): Promise<{ href: string; identifier: string }[]> {
  const test = await qtiTransformTest().load(`${TEST_BASE}/AssessmentTest.xml`);
  return test.items().map(item => ({ href: item.href, identifier: item.identifier }));
}

/** Import a QTI 3.0 item from `href` into a ProseMirror document for this schema. */
export function importQtiItem(href: string): Promise<ProseMirrorNode> {
  return importItemFromUrl(href, schema);
}

/** Serialize a ProseMirror document back to a QTI 3.0 item XML string. */
export function exportQtiItem(doc: ProseMirrorNode): string {
  return exportItemXml(doc, schema);
}
