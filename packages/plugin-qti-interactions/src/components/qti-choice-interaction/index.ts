/**
 * QTI Choice Interaction Module
 *
 * Complete module for the qti-choice-interaction element including:
 * - Schema (ProseMirror NodeSpec)
 * - Commands (insert interaction)
 * - Keymaps (Enter to split, Backspace to lift, Mod-Shift-Q to insert)
 * - Guards (prevent invalid nesting)
 * - Component (Lit web component)
 */

// Schema
export { choiceInteractionSchema } from './schema.generated';

// Commands
export { insertChoiceInteraction } from './commands';

// Generated metadata
export { qtiChoiceInteractionDefinition } from './element-definition.generated';

// Keymaps
export {
  createChoiceInteractionKeymap,
  splitQtiSimpleChoice,
  liftEmptyQtiSimpleChoice,
} from './keymap';

// Guards
export { createChoiceInteractionGuards } from './guards';

// Component
export { QtiChoiceInteraction } from './qti-choice-interaction';
