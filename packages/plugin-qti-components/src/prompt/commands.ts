import { defineCommands } from 'prosekit/core';
import type { Command } from 'prosekit/pm/state';

/**
 * Command to insert a QTI prompt
 */
export const insertQtiPrompt: Command = (state, dispatch) => {
  const promptNode = state.schema.nodes.qti_prompt?.create(
    null,
    state.schema.nodes.paragraph.create(
      null,
      state.schema.text('Enter your question here'),
    ),
  );
  if (!promptNode) return false;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(promptNode).scrollIntoView());
  return true;
};

export const qtiPromptCommands = defineCommands({
  insertQtiPrompt: () => insertQtiPrompt,
});
