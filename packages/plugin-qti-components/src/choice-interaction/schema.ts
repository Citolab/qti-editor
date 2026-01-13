import { defineNodeSpec } from 'prosekit/core';

import { nodes as generatedNodes } from '../shared/generated-prosemirror-schema';

export const qtiChoiceInteractionSpec = defineNodeSpec({
  name: 'qti_choice_interaction',
  ...generatedNodes.qti_choice_interaction,
});
