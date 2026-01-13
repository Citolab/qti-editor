import './styles.css';

import { union, type Extension } from 'prosekit/core';

import { qtiPromptSpec } from './schema';
import { qtiPromptCommands } from './commands';
import { qtiPromptKeymap } from './keymap';

export { qtiPromptSpec } from './schema';
export { insertQtiPrompt, qtiPromptCommands } from './commands';
export { qtiPromptKeymap } from './keymap';

export function qtiPromptExtension(): Extension {
  return union([qtiPromptSpec, qtiPromptCommands, qtiPromptKeymap]);
}
