/**
 * QTI Text Entry Interaction Keymaps
 *
 * Keyboard shortcuts for text entry interactions:
 * - Mod-Shift-T: Insert a text entry interaction
 */

import { keymap } from 'prosemirror-keymap';
import type { Plugin } from 'prosemirror-state';
import { insertTextEntryInteraction } from './commands';

/**
 * Create the keymap plugin for text entry interactions
 */
export function createTextEntryInteractionKeymap(): Plugin {
  return keymap({
    'Mod-Shift-t': insertTextEntryInteraction,
  });
}
