import { defineNodeSpec } from 'prosekit/core';

import { nodes as generatedNodes } from '../shared/generated-prosemirror-schema';

/**
 * QTI Prompt Node Specification
 * Used to display questions or instructions in QTI interactions
 */
export const qtiPromptSpec = defineNodeSpec({
  name: 'qti_prompt',
  ...generatedNodes.qti_prompt,
});
