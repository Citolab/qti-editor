import { defineKeymap } from 'prosekit/core';

import { insertQtiSimpleChoice, splitSimpleChoice } from './commands';

export const qtiSimpleChoiceKeymap = defineKeymap({
  'Mod-Shift-c': insertQtiSimpleChoice,
  Enter: splitSimpleChoice,
});
