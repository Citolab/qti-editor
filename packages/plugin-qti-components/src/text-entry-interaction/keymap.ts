import { defineKeymap } from 'prosekit/core';

import { insertTextEntryInteraction } from './commands';

// Keymaps for text entry interaction
export const textEntryInteractionKeymap = defineKeymap({
  'Mod-Shift-t': insertTextEntryInteraction,
});
