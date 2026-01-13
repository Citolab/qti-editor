import './styles.css';

import { union, type Extension } from 'prosekit/core';

import { qtiSimpleChoiceCommands } from './commands';
import { qtiSimpleChoiceKeymap } from './keymap';
import { qtiSimpleChoiceSpec } from './schema';

export { qtiSimpleChoiceSpec } from './schema';
export { insertQtiSimpleChoice, splitSimpleChoice, qtiSimpleChoiceCommands } from './commands';
export { qtiSimpleChoiceKeymap } from './keymap';

export function qtiSimpleChoiceExtension(): Extension {
  return union([qtiSimpleChoiceSpec, qtiSimpleChoiceCommands, qtiSimpleChoiceKeymap]);
}
