/**
 * QTI Choice Interaction Commands
 *
 * Backward-compatible command barrel that re-exports insert and convert commands.
 */

export {
  insertChoiceInteraction,
  insertSimpleChoiceOnEnter,
  qtiChoiceEnterCommand
} from './commands/insert-choice-interaction.commands.js';

export {
  canConvertListToChoiceInteraction,
  convertListToChoiceInteraction
} from './commands/convert-selection-to-choice.commands.js';
