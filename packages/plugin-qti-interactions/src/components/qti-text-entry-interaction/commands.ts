/**
 * QTI Text Entry Interaction Commands
 *
 * ProseMirror commands for inserting text entry interactions.
 */

import type { Command } from 'prosemirror-state';

/**
 * Command to insert a text entry interaction at the current selection
 */
export const insertTextEntryInteraction: Command = (state, dispatch) => {
  const type = state.schema.nodes.qti_text_entry_interaction;
  if (!type) return false;

  const textEntry = type.create({
    responseIdentifier: `TEXT_${Date.now()}`,
  });

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(textEntry).scrollIntoView());
  }
  return true;
};
