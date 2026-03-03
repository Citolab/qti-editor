/**
 * QTI Choice Interaction Commands
 *
 * ProseMirror commands for inserting and manipulating choice interactions.
 */

import type { Command } from 'prosemirror-state';

/**
 * Command to insert a choice interaction at the current selection
 */
export const insertChoiceInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const promptType = schema.nodes.qtiPrompt;
  const choiceType = schema.nodes.qtiSimpleChoice;
  const interactionType = schema.nodes.qtiChoiceInteraction;

  if (!promptType || !choiceType || !interactionType) return false;

  const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
  const prompt = promptType.create(null, schema.nodes.paragraph.create(null, schema.text('Which option is correct?')));

  const choices = [
    choiceType.create({ identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` }, schema.text('Option A')),
    choiceType.create({ identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` }, schema.text('Option B')),
    choiceType.create({ identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` }, schema.text('Option C'))
  ];

  const interaction = interactionType.create({ responseIdentifier, maxChoices: 1 }, [
    prompt,
    ...choices
  ]);

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  }
  return true;
};
