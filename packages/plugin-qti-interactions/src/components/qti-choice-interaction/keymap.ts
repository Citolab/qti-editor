/**
 * QTI Choice Interaction Keymaps
 *
 * Keyboard shortcuts specific to choice interactions:
 * - Mod-Shift-Q: Insert a choice interaction
 * - Enter: Split simple choice or exit interaction if empty
 * - Backspace: Lift out of empty simple choice
 */

import { keymap } from 'prosemirror-keymap';
import { NodeSelection, TextSelection, type Command } from 'prosemirror-state';
import type { Plugin } from 'prosemirror-state';
import { insertChoiceInteraction } from './commands';

/**
 * Command to split a QTI simple choice on Enter
 * Creates a new simple choice below the current one
 */
export const splitQtiSimpleChoice: Command = (state, dispatch) => {
  const { $from } = state.selection;

  // Don't handle if we have a node selection
  if (state.selection instanceof NodeSelection) return false;

  // Need to be inside a simple choice (depth >= 2)
  if ($from.depth < 2) return false;

  const paragraph = $from.parent;
  const simpleChoice = $from.node(-1);
  const choiceInteraction = $from.node(-2);

  // Verify we're in the right structure
  if (
    paragraph.type.name !== 'paragraph' ||
    simpleChoice?.type.name !== 'qti_simple_choice' ||
    choiceInteraction?.type.name !== 'qti_choice_interaction'
  ) {
    return false;
  }

  if (!dispatch) return true;

  const { schema } = state;
  const tr = state.tr;

  // If empty choice and at the start, exit the interaction
  if (paragraph.content.size === 0 && $from.parentOffset === 0) {
    const choiceInteractionAfter = $from.after(-2);
    const newParagraph = schema.nodes.paragraph.create();
    tr.insert(choiceInteractionAfter, newParagraph);
    tr.setSelection(TextSelection.near(tr.doc.resolve(choiceInteractionAfter + 1)));
    dispatch(tr);
    return true;
  }

  // Split the paragraph content at cursor position
  const contentAfter = paragraph.content.cut($from.parentOffset);
  const contentBefore = paragraph.content.cut(0, $from.parentOffset);

  // Update current paragraph with content before cursor
  tr.replaceWith(
    $from.start(),
    $from.end(),
    schema.nodes.paragraph.create(null, contentBefore),
  );

  // Insert new choice with content after cursor
  const newChoicePos = tr.mapping.map($from.after(-1));
  const newChoice = schema.nodes.qti_simple_choice.create(
    { identifier: `choice_${Date.now()}` },
    schema.nodes.paragraph.create(null, contentAfter.size > 0 ? contentAfter : null),
  );
  tr.insert(newChoicePos, newChoice);

  // Set cursor at start of new choice
  tr.setSelection(TextSelection.near(tr.doc.resolve(newChoicePos + 2)));

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

  const paragraph = $from.parent;
  const simpleChoice = $from.node(-1);
  const choiceInteraction = $from.node(-2);

  // Verify we're in the right structure
  if (
    paragraph.type.name !== 'paragraph' ||
    simpleChoice?.type.name !== 'qti_simple_choice' ||
    choiceInteraction?.type.name !== 'qti_choice_interaction'
  ) {
    return false;
  }

  // Only lift if we're at the start of an empty simple choice
  if (paragraph.content.size !== 0 || $from.parentOffset !== 0) {
    return false;
  }

  // Don't delete if it's the only choice
  const choiceCount = choiceInteraction.content.content.filter(
    (n) => n.type.name === 'qti_simple_choice'
  ).length;
  if (choiceCount <= 1) return false;

  if (!dispatch) return true;

  const tr = state.tr;

  // Delete the simple choice node
  tr.delete($from.before(-1), $from.after(-1));

  dispatch(tr);
  return true;
};

/**
 * Create the keymap plugin for choice interactions
 */
export function createChoiceInteractionKeymap(): Plugin {
  return keymap({
    'Mod-Shift-q': insertChoiceInteraction,
    Enter: splitQtiSimpleChoice,
    Backspace: liftEmptyQtiSimpleChoice,
  });
}
