import { defineNodeSpec } from 'prosekit/core';

import { nodes as generatedNodes } from '../shared/generated-prosemirror-schema';

export const qtiTextEntryInteractionSpec = defineNodeSpec({
  name: 'qti_text_entry_interaction',
  ...generatedNodes.qti_text_entry_interaction,
});
