import { defineCommands } from 'prosekit/core';
import type { Command } from 'prosekit/pm/state';

// Command to insert a text entry interaction
export const insertTextEntryInteraction: Command = (state, dispatch) => {
  const type = state.schema.nodes.qti_text_entry_interaction;
  if (!type) return false;

  const textEntry = type.create({
    responseIdentifier: `TEXT_${Date.now()}`,
  });

  if (dispatch) dispatch(state.tr.replaceSelectionWith(textEntry).scrollIntoView());
  return true;
};

// Commands for text entry interaction
export const textEntryInteractionCommands = defineCommands({
  insertTextEntryInteraction: () => insertTextEntryInteraction,
});
