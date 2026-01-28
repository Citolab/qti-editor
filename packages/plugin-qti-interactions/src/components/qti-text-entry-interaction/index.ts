/**
 * QTI Text Entry Interaction Module
 *
 * Module for the qti-text-entry-interaction element including:
 * - Schema (ProseMirror NodeSpec)
 * - Commands (insert interaction)
 * - Keymaps (Mod-Shift-T to insert)
 * - Component (Lit web component)
 */

// Schema
export { textEntryInteractionSchema } from './schema';

// Commands
export { insertTextEntryInteraction } from './commands';

// Keymaps
export { createTextEntryInteractionKeymap } from './keymap';

// Component
export { QtiTextEntryInteraction } from './qti-text-entry-interaction';
