import { defineNodeSpec } from 'prosekit/core';

import { nodes as generatedNodes } from '../shared/generated-prosemirror-schema';

/**
 * QTI Simple Choice Node Specification
 * Represents a single answer option in QTI interactions
 */
export const qtiSimpleChoiceSpec = defineNodeSpec({
  name: 'qti_simple_choice',
  ...generatedNodes.qti_simple_choice,
});
