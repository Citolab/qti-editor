/**
 * Editor schema — basic prose nodes + QTI interaction node specs.
 *
 * The schema is assembled from the interaction descriptors this minimal editor
 * understands. Each descriptor contributes its NodeSpec(s); the `doc` node is
 * augmented with `identifier`/`title` attributes supplied from the imported
 * item.
 */

import { Schema } from 'prosemirror-model';
import { nodes, marks } from 'prosemirror-schema-basic';
import { choiceInteractionDescriptor } from '@qti-editor/interaction-choice';
import { extendedTextInteractionDescriptor } from '@qti-editor/interaction-extended-text';
import { textEntryInteractionDescriptor } from '@qti-editor/interaction-text-entry';
import { qtiRubricBlockDescriptor } from '@qti-editor/qti-rubric-block';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

/** Every descriptor this minimal editor understands. */
export const descriptors = [
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
export const editableAttrs = Object.fromEntries(
  descriptors.flatMap(descriptor =>
    Object.values(descriptor.attributePanelMetadata ?? {}).map(metadata => [
      metadata.nodeTypeName,
      metadata.editableAttributes ?? []
    ])
  )
);
