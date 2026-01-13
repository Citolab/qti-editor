import './styles.css';

import { union, type Extension } from 'prosekit/core';

import { qtiPromptCommands } from './commands';
import { qtiPromptKeymap } from './keymap';
import { qtiPromptSpec } from './schema';

export { qtiPromptSpec } from './schema';
export { insertQtiPrompt, qtiPromptCommands } from './commands';
export { qtiPromptKeymap } from './keymap';

export function qtiPromptExtension(): Extension {
  return union([qtiPromptSpec, qtiPromptCommands, qtiPromptKeymap]);
}
