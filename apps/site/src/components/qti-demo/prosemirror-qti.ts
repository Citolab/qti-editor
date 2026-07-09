/**
 * Landing-page demo's QTI integration layer — descriptors, plugins, and the
 * seed item roundtrip. Mirrors the pattern documented in
 * `/docs/frameworks/vanilla`, trimmed to the choice and text-entry
 * interactions the demo shows.
 */

import { chainCommands } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { choiceInteractionDescriptor } from '@citolab/prose-qti/components/choice';
import { textEntryInteractionDescriptor } from '@citolab/prose-qti/components/text-entry';
import { exportItemXml, importItemFromString } from '@citolab/prose-qti/item-roundtrip';

// Side-effect imports register the Lit custom elements used by the node views.
import '@citolab/prose-qti/components/choice/register.js';
import '@citolab/prose-qti/components/text-entry/register.js';
import '@citolab/prose-qti/components/shared/components/qti-prompt/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-choice/register.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';
import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';

export const descriptors: InteractionDescriptor[] = [choiceInteractionDescriptor, textEntryInteractionDescriptor];

const enterCommand = chainCommands(...descriptors.flatMap(d => d.enterCommand ?? []));
const backspaceCommand = chainCommands(...descriptors.flatMap(d => d.backspaceCommand ?? []));

export const qtiPlugins: Plugin[] = [
  keymap({ Enter: enterCommand, Backspace: backspaceCommand }),
  ...descriptors.flatMap(d => d.pluginFactories?.map(factory => factory()) ?? []),
];

/** A tiny seed item: one choice interaction, one text-entry interaction. */
const seedItemXml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
                      identifier="site-demo-item" title="QTI Editor demo" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>choice_b</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-response-declaration identifier="RESPONSE_2" cardinality="single" base-type="string">
    <qti-correct-response><qti-value>ProseMirror</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-item-body>
    <p>Which library gives QTI Editor its structured document model?</p>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" min-choices="1" max-choices="1">
      <qti-prompt>Pick one.</qti-prompt>
      <qti-simple-choice identifier="choice_a">Redux</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">ProseMirror</qti-simple-choice>
      <qti-simple-choice identifier="choice_c">jQuery</qti-simple-choice>
    </qti-choice-interaction>
    <p>Type it again: <qti-text-entry-interaction response-identifier="RESPONSE_2" expected-length="15"/></p>
  </qti-item-body>
</qti-assessment-item>`;

/** Build the demo's starting document from the embedded seed item. */
export function seedDoc(schema: Schema): ProseMirrorNode {
  return importItemFromString(seedItemXml, schema);
}

/** Serialize the current document back to a QTI 3.0 item XML string. */
export function exportQtiItem(doc: ProseMirrorNode, schema: Schema): string {
  return exportItemXml(doc, schema);
}
