/**
 * QTI Choice Interaction Component
 *
 * Provides the choice interaction node for multiple choice questions.
 * Exports schema, commands, and keymaps for choice interactions.
 *
 * Based on QTI 3.0 spec: https://www.imsglobal.org/spec/qti/v3p0/impl#h.m12qketwgcxe
 */

// Import styles
import './styles.css';

import { union } from 'prosekit/core';
import type { Extension } from 'prosekit/core';

import type { QtiChoiceInteractionSchema } from '../shared/qti-schema';

import { insertChoiceInteraction, choiceInteractionCommands } from './commands';
import { choiceInteractionGuardsExtension } from './guards';
import { choiceInteractionKeymap } from './keymap';
import { qtiChoiceInteractionSpec } from './schema';

export { qtiChoiceInteractionSpec } from './schema';
export { insertChoiceInteraction, choiceInteractionCommands } from './commands';
export { choiceInteractionKeymap } from './keymap';
export type { QtiChoiceInteractionSchema };

/**
 * Choice Interaction node specification
 * Implements QTI 3.0 choiceInteraction element
 *
 * @see QtiChoiceInteractionSchema for full attribute definitions
 */
// Complete extension for choice interaction
export function choiceInteractionExtension(): Extension {
  return union([
    qtiChoiceInteractionSpec,
    choiceInteractionCommands,
    choiceInteractionKeymap,
    choiceInteractionGuardsExtension(),
  ]);
}
