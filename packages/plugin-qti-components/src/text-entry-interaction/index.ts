/**
 * QTI Text Entry Interaction Component
 *
 * Provides the text entry interaction node for fill-in-the-blank questions.
 * Exports schema, commands, and keymaps for text entry interactions.
 *
 * Based on QTI 3.0 spec: https://www.imsglobal.org/spec/qti/v3p0/impl#h.m12qketwgcxe
 */

// Import styles
import './styles.css';

import { union } from 'prosekit/core';
import type { Extension } from 'prosekit/core';

// Import QTI schema definitions
import type { QtiTextEntryInteractionSchema } from '../shared/qti-schema';

import { insertTextEntryInteraction, textEntryInteractionCommands } from './commands';
import { textEntryInteractionKeymap } from './keymap';
import { qtiTextEntryInteractionSpec } from './schema';

export { qtiTextEntryInteractionSpec } from './schema';
export { insertTextEntryInteraction, textEntryInteractionCommands } from './commands';
export { textEntryInteractionKeymap } from './keymap';
export type { QtiTextEntryInteractionSchema };

// Complete extension for text entry interaction
export function textEntryInteractionExtension(): Extension {
  return union([
    qtiTextEntryInteractionSpec,
    textEntryInteractionCommands,
    textEntryInteractionKeymap,
  ]);
}
