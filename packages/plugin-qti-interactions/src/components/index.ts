/**
 * QTI Components
 *
 * Each component module includes:
 * - Schema (ProseMirror NodeSpec)
 * - Commands (insert/manipulation commands)
 * - Keymaps (keyboard shortcuts)
 * - Guards (transaction filters)
 * - Component (Lit web component)
 */

// =============================================================================
// Choice Interaction
// =============================================================================

// =============================================================================
// Convenience: All Schemas
// =============================================================================

import type { Plugin } from 'prosemirror-state';
import { choiceInteractionSchema , createChoiceInteractionKeymap, createChoiceInteractionGuards } from './qti-choice-interaction';
import { promptSchema } from './qti-prompt';
import { simpleChoiceSchema } from './qti-simple-choice';
import { textEntryInteractionSchema , createTextEntryInteractionKeymap } from './qti-text-entry-interaction';

// =============================================================================
// Convenience: All Plugins
// =============================================================================


export {
  // Schema
  choiceInteractionSchema,
  // Commands
  insertChoiceInteraction,
  // Keymaps
  createChoiceInteractionKeymap,
  splitQtiSimpleChoice,
  liftEmptyQtiSimpleChoice,
  // Guards
  createChoiceInteractionGuards,
  // Component
  QtiChoiceInteraction,
} from './qti-choice-interaction';

// =============================================================================
// Simple Choice
// =============================================================================

export {
  // Schema
  simpleChoiceSchema,
  // Component
  QtiSimpleChoice,
} from './qti-simple-choice';

// =============================================================================
// Prompt
// =============================================================================

export {
  // Schema
  promptSchema,
  // Component
  QtiPrompt,
} from './qti-prompt';

// =============================================================================
// Text Entry Interaction
// =============================================================================

export {
  // Schema
  textEntryInteractionSchema,
  // Commands
  insertTextEntryInteraction,
  // Keymaps
  createTextEntryInteractionKeymap,
  // Component
  QtiTextEntryInteraction,
} from './qti-text-entry-interaction';

/**
 * All QTI node schemas, ready to be merged into a ProseMirror schema
 */
export const qtiNodeSchemas = {
  qti_choice_interaction: choiceInteractionSchema,
  qti_simple_choice: simpleChoiceSchema,
  qti_prompt: promptSchema,
  qti_text_entry_interaction: textEntryInteractionSchema,
};

/**
 * Create all QTI ProseMirror plugins
 *
 * Returns an array of plugins:
 * - Choice interaction keymap (Enter, Backspace, Mod-Shift-Q)
 * - Text entry keymap (Mod-Shift-T)
 * - Choice interaction guards
 */
export function createAllQtiPlugins(): Plugin[] {
  return [
    createChoiceInteractionKeymap(),
    createTextEntryInteractionKeymap(),
    createChoiceInteractionGuards(),
  ];
}
