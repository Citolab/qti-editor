import type { Command } from 'prosemirror-state';

/**
 * Command to insert a select point interaction at the current selection.
 */
export const insertSelectPointInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const interactionType = schema.nodes.qtiSelectPointInteraction;
  const promptType = schema.nodes.qtiPrompt;
  const promptParagraphType = schema.nodes.qtiPromptParagraph;
  const imgSelectPointType = schema.nodes.imgSelectPoint;

  if (!interactionType || !promptType || !promptParagraphType || !imgSelectPointType) return false;

  const prompt = promptType.create(
    null,
    promptParagraphType.create(null, schema.text('Mark the correct point on the image.')),
  );
  const imgSelectPoint = imgSelectPointType.create();

  const interaction = interactionType.create({
    responseIdentifier: `RESPONSE_${crypto.randomUUID()}`,
    maxChoices: 0,
    minChoices: 0,
    areaMappings: '[]',
  }, [prompt, imgSelectPoint]);

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  }

  return true;
};
