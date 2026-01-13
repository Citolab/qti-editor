import './styles.css';

import { union, type Extension } from 'prosekit/core';

import { qtiSimpleChoiceSpec } from './schema';
import { qtiSimpleChoiceCommands } from './commands';
import { qtiSimpleChoiceKeymap } from './keymap';

export { qtiSimpleChoiceSpec } from './schema';
export { insertQtiSimpleChoice, splitSimpleChoice, qtiSimpleChoiceCommands } from './commands';
export { qtiSimpleChoiceKeymap } from './keymap';

export function qtiSimpleChoiceExtension(): Extension {
  return union([qtiSimpleChoiceSpec, qtiSimpleChoiceCommands, qtiSimpleChoiceKeymap]);
}
