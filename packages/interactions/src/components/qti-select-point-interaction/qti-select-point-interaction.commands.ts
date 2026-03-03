import type { Command } from 'prosemirror-state';

/**
 * Command to insert a select point interaction at the current selection.
 */
export const insertSelectPointInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const interactionType = schema.nodes.qtiSelectPointInteraction;
  const promptType = schema.nodes.qtiPrompt;
  const imgSelectPointType = schema.nodes.imgSelectPoint;
  const paragraphType = schema.nodes.paragraph;

  if (!interactionType || !promptType || !imgSelectPointType || !paragraphType) return false;

  const prompt = promptType.create(
    null,
    paragraphType.create(null, schema.text('Mark the correct point on the image.')),
  );
  const imgSelectPoint = imgSelectPointType.create({
    areaMappings: '[]',
  });

  const interaction = interactionType.create({
    responseIdentifier: `RESPONSE_${crypto.randomUUID()}`,
    maxChoices: 0,
    minChoices: 0,
  }, [prompt, imgSelectPoint]);

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  }

  return true;
};
