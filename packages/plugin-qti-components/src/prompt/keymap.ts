import { defineKeymap } from 'prosekit/core';

import { insertQtiPrompt } from './commands';

export const qtiPromptKeymap = defineKeymap({
  'Mod-Shift-p': insertQtiPrompt,
});
