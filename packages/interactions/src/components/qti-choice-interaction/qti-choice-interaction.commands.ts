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
  const promptParagraphType = schema.nodes.qtiPromptParagraph;
  const choiceType = schema.nodes.qtiSimpleChoice;
  const choiceParagraphType = schema.nodes.qtiSimpleChoiceParagraph;
  const interactionType = schema.nodes.qtiChoiceInteraction;

  if (!promptType || !promptParagraphType || !choiceType || !choiceParagraphType || !interactionType) return false;

  const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
  const prompt = promptType.create(null, promptParagraphType.create(null, schema.text('Which option is correct?')));

  const choices = [
    choiceType.create(
      { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
      choiceParagraphType.create(null, schema.text('Option A'))
    ),
    choiceType.create(
      { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
      choiceParagraphType.create(null, schema.text('Option B'))
    ),
    choiceType.create(
      { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
      choiceParagraphType.create(null, schema.text('Option C'))
    )
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
