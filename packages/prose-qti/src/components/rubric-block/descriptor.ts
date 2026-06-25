import { insertRubricBlock } from './qti-rubric-block.commands.js';
import { qtiRubricBlockNodeSpec } from './qti-rubric-block.schema.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

/**
 * Descriptor for the QTI rubric block.
 *
 * Not an interaction — but registered through the same descriptor pipeline so
 * its NodeSpec, insert command, and attribute panel show up automatically.
 *
 * Round-trips losslessly via the schema's parseDOM/toDOM. There is no
 * composerHandler because the rubric block is not a QTI interaction and the
 * core composer passes non-interaction qti-* elements through unchanged.
 */
export const qtiRubricBlockDescriptor = {
  tagName: 'qti-rubric-block',
  nodeTypeName: 'qtiRubricBlock',
  nodeSpecs: [
    { name: 'qtiRubricBlock', spec: qtiRubricBlockNodeSpec },
  ],
  insertCommand: insertRubricBlock,
  composerMetadata: {
    tagName: 'qti-rubric-block',
    nodeTypeName: 'qtiRubricBlock',
    responseProcessing: {
      templateUri: '',
      internalSourceXml: '',
    },
    strippedAttributes: [],
  },
  composerHandler: undefined,
  attributePanelMetadata: {
    qtirubricblock: {
      nodeTypeName: 'qtiRubricBlock',
      editableAttributes: ['use', 'view'],
      // The prosekit panel renders <qti-rubric-block-attributes-editor> for
      // the `use`/`view` enums (see prose-qti-ui). The prosemirror panel
      // doesn't ship a registry of friendly editors and renders the attrs
      // as plain text — acceptable since the prosemirror-item app does not
      // author rubric blocks.
      friendlyEditors: [{ attribute: 'use', kind: 'rubricBlockAttributes' }],
    },
  },
} satisfies InteractionDescriptor;
