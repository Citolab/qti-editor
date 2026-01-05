/**
 * Choice Interaction Keymaps
 *
 * Provides keyboard shortcuts specific to QTI choice interactions:
 * - Enter: Split simple choice or exit interaction if empty
 * - Backspace: Lift out of empty simple choice
 */

import type { Extension } from 'prosekit/core';
import { defineKeymap } from 'prosekit/core';
import { NodeSelection, TextSelection } from 'prosekit/pm/state';

import type { Command } from 'prosekit/pm/state';

/**
 * Command to split a QTI simple choice on Enter
 * Similar to splitListItem but for QTI choices
 */
export const splitQtiSimpleChoice: Command = (state, dispatch) => {
  const { $from } = state.selection;

  // Don't handle if we have a node selection
  if (state.selection instanceof NodeSelection) return false;

  // Need to be inside a simple choice
  if ($from.depth < 2) return false;

  const simpleChoice = $from.parent;
  const choiceInteraction = $from.node(-1);

  // Verify we're in the right structure
  if (
    simpleChoice.type.name !== 'qti_simple_choice' ||
    choiceInteraction.type.name !== 'qti_choice_interaction'
  ) {
    return false;
  }

  if (!dispatch) return true;

  const { schema } = state;
  let tr = state.tr;

  // If empty choice, exit the interaction
  if (simpleChoice.content.size === 0) {
    const choiceInteractionEnd = $from.end(-1);
    const newParagraph = schema.nodes.paragraph.create();
    tr.insert(choiceInteractionEnd, newParagraph);
    tr.setSelection(
      TextSelection.near(tr.doc.resolve(choiceInteractionEnd + 1)),
    );
    dispatch(tr);
    return true;
  }

  // Split the content at cursor position
  const contentAfter = simpleChoice.content.cut($from.parentOffset);
  const contentBefore = simpleChoice.content.cut(0, $from.parentOffset);

  // Update current choice with content before cursor
  tr.replaceWith($from.start(), $from.end(), contentBefore);

  // Insert new choice with content after cursor
  const newChoicePos = $from.start() + contentBefore.size;
  const newChoice = schema.nodes.qti_simple_choice.create(
    { identifier: `choice_${Date.now()}` },
    contentAfter,
  );
  tr.insert(newChoicePos, newChoice);

  // Set cursor at start of new choice
  tr.setSelection(TextSelection.near(tr.doc.resolve(newChoicePos + 1)));

  dispatch(tr);
  return true;
};

/**
 * Command to lift out of empty QTI simple choice on Backspace
 */
export const liftEmptyQtiSimpleChoice: Command = (state, dispatch) => {
  const { $from } = state.selection;

  // Need to be inside a simple choice
  if ($from.depth < 2) return false;

  const simpleChoice = $from.parent;
  const choiceInteraction = $from.node(-1);

  // Verify we're in the right structure
  if (
    simpleChoice.type.name !== 'qti_simple_choice' ||
    choiceInteraction.type.name !== 'qti_choice_interaction'
  ) {
    return false;
  }

  // Only lift if we're at the start of an empty simple choice
  if (simpleChoice.content.size !== 0 || $from.parentOffset !== 0) {
    return false;
  }

  if (!dispatch) return true;

  const { schema } = state;
  let tr = state.tr;
  const choiceInteractionEnd = $from.end(-1);
  const newParagraph = schema.nodes.paragraph.create();

  // Remove the empty simple choice and add paragraph after interaction
  const simpleChoiceStart = $from.start();
  const simpleChoiceEnd = $from.end();
  tr.delete(simpleChoiceStart - 1, simpleChoiceEnd);
  tr.insert(
    choiceInteractionEnd - (simpleChoiceEnd - simpleChoiceStart + 1),
    newParagraph,
  );
  tr.setSelection(
    TextSelection.near(
      tr.doc.resolve(
        choiceInteractionEnd - (simpleChoiceEnd - simpleChoiceStart),
      ),
    ),
  );

  dispatch(tr);
  return true;
};

/**
 * Keymaps for choice interaction
 */
export const choiceInteractionKeymap = defineKeymap({
  // Enter key splits simple choice or exits if empty
  Enter: splitQtiSimpleChoice,
  // Backspace lifts out of empty simple choice
  Backspace: liftEmptyQtiSimpleChoice,
});

/**
 * Export as extension for easy registration
 */
export function choiceInteractionKeymapExtension(): Extension {
  return choiceInteractionKeymap;
}
