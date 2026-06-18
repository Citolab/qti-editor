import { insertRubricBlock } from './qti-rubric-block.commands.js';
import {
  qtiRubricBlockNodeSpec,
  QTI_RUBRIC_BLOCK_USE_VALUES,
  QTI_RUBRIC_BLOCK_VIEW_VALUES,
} from './qti-rubric-block.schema.js';

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
      fields: {
        use: {
          label: 'Use',
          input: 'select',
          options: QTI_RUBRIC_BLOCK_USE_VALUES.map((v) => ({ value: v, label: v })),
        },
        view: {
          label: 'View',
          input: 'select',
          options: QTI_RUBRIC_BLOCK_VIEW_VALUES.map((v) => ({ value: v, label: v })),
        },
      },
    },
  },
} satisfies InteractionDescriptor;
