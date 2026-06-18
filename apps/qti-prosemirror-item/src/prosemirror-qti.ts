/**
 * QTI integration layer — descriptors, plugins, attribute allowlist, and the
 * QTI 3.0 item roundtrip. The schema topology (which nodes exist, what groups
 * they join, what content they accept) is composed in `./schema.ts`, which
 * imports `descriptors` from this module.
 *
 * What this module contributes:
 * - `descriptors`: the interaction descriptor registry. Consumed by `schema.ts`
 *   for NodeSpecs, by `main.ts` for the Insert menu, and below for plugins and
 *   the attribute allowlist.
 * - `qtiPlugins`: the interaction descriptors' own ProseMirror plugins plus the
 *   choice-aware Enter/Backspace keymap. These return false when no interaction
 *   applies, so compose them before the list-split and `baseKeymap` keymaps.
 * - `editableAttrs`: the per-node attribute allowlist for the attributes panel.
 * - `loadQtiItems` / `importQtiItem` / `exportQtiItem`: the QTI 3.0 roundtrip
 *   (the import/export helpers take the composed schema as an argument).
 *
 * It also carries the side-effect imports that register the QTI interaction edit
 * elements (custom elements used by the node views).
 *
 * Supported interactions: choice, extended-text, text-entry, associate,
 * gap-match, hottext, inline-choice, match, order, select-point (+ rubric block).
 */

import { chainCommands } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { choiceInteractionDescriptor } from '@citolab/prose-qti/components/choice';
import { extendedTextInteractionDescriptor } from '@citolab/prose-qti/components/extended-text';
import { textEntryInteractionDescriptor } from '@citolab/prose-qti/components/text-entry';
import { associateInteractionDescriptor } from '@citolab/prose-qti/components/associate';
import { gapMatchInteractionDescriptor } from '@citolab/prose-qti/components/gap-match';
import { hottextInteractionDescriptor } from '@citolab/prose-qti/components/hottext';
import { inlineChoiceInteractionDescriptor } from '@citolab/prose-qti/components/inline-choice';
import { matchInteractionDescriptor } from '@citolab/prose-qti/components/match';
import { orderInteractionDescriptor } from '@citolab/prose-qti/components/order';
import { selectPointInteractionDescriptor } from '@citolab/prose-qti/components/select-point';
import { qtiRubricBlockDescriptor } from '@citolab/prose-qti/components/rubric-block';
import { exportItemXml, importItemFromUrl } from '@citolab/prose-qti/item-roundtrip';

import { qtiTransformTest } from '@qti-components/transformers';

// Register the interaction edit elements (custom elements used by the views).
import '@citolab/prose-qti/components/choice/register.js';
import '@citolab/prose-qti/components/extended-text/register.js';
import '@citolab/prose-qti/components/text-entry/register.js';
import '@citolab/prose-qti/components/associate/register.js';
import '@citolab/prose-qti/components/gap-match/register.js';
import '@citolab/prose-qti/components/hottext/register.js';
import '@citolab/prose-qti/components/inline-choice/register.js';
import '@citolab/prose-qti/components/match/register.js';
import '@citolab/prose-qti/components/order/register.js';
import '@citolab/prose-qti/components/select-point/register.js';
import '@citolab/prose-qti/components/shared/components/qti-prompt/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-choice/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-associable-choice/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-match-set/register.js';
import '@citolab/prose-qti/components/shared/components/qti-gap/register.js';
import '@citolab/prose-qti/components/shared/components/qti-gap-text/register.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';
import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';

/** Every descriptor this minimal editor understands. */
export const descriptors: InteractionDescriptor[] = [
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
];

/** Editable-attribute allowlist for the panel, keyed by node type. */
export const editableAttrs = Object.fromEntries(
  descriptors.flatMap(descriptor =>
    Object.values(descriptor.attributePanelMetadata ?? {}).map(metadata => [
      metadata.nodeTypeName,
      metadata.editableAttributes ?? []
    ])
  )
);

/**
 * Enter/Backspace insert or remove a sibling option for whichever interaction the
 * selection is in (choice, inline-choice, …); each tries in turn and returns
 * false when none applies, letting the composition root's list-split and base
 * keymaps take over.
 */
const enterCommand = chainCommands(...descriptors.flatMap(descriptor => descriptor.enterCommand ?? []));
const backspaceCommand = chainCommands(...descriptors.flatMap(descriptor => descriptor.backspaceCommand ?? []));

/**
 * QTI-specific plugins: the interaction-aware Enter/Backspace keymap plus each
 * descriptor's own plugins. The keymap returns false when no interaction handles
 * the key, so compose these *before* the list-split and `keymap(baseKeymap)`
 * keymaps so the QTI overrides win and unhandled keys fall through.
 */
export const qtiPlugins: Plugin[] = [
  keymap({ Enter: enterCommand, Backspace: backspaceCommand }),
  ...descriptors.flatMap(descriptor => descriptor.pluginFactories?.map(factory => factory()) ?? [])
];

const TEST_BASE = '/qti/kennisnet';

/** Load the Kennisnet sample item refs from `AssessmentTest.xml`. */
export async function loadQtiItems(): Promise<{ href: string; identifier: string }[]> {
  const test = await qtiTransformTest().load(`${TEST_BASE}/AssessmentTest.xml`);
  return test.items().map(item => ({ href: item.href, identifier: item.identifier }));
}

/** Import a QTI 3.0 item from `href` into a ProseMirror document for `schema`. */
export function importQtiItem(href: string, schema: Schema): Promise<ProseMirrorNode> {
  return importItemFromUrl(href, schema);
}

/** Serialize a ProseMirror document back to a QTI 3.0 item XML string. */
export function exportQtiItem(doc: ProseMirrorNode, schema: Schema): string {
  return exportItemXml(doc, schema);
}
