import type { Command } from 'prosemirror-state';

/**
 * Command to insert an inline choice interaction at the current selection.
 */
export const insertInlineChoiceInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const interactionType = schema.nodes.qtiInlineChoiceInteraction;
  const inlineChoiceType = schema.nodes.qtiInlineChoice;

  if (!interactionType || !inlineChoiceType) return false;

  const interaction = interactionType.create(
    {
      responseIdentifier: `RESPONSE_${crypto.randomUUID()}`,
      shuffle: false
    },
    [
      inlineChoiceType.create({ identifier: `INLINE_CHOICE_${crypto.randomUUID()}` }, schema.text('Gloucester')),
      inlineChoiceType.create({ identifier: `INLINE_CHOICE_${crypto.randomUUID()}` }, schema.text('Lancaster')),
      inlineChoiceType.create({ identifier: `INLINE_CHOICE_${crypto.randomUUID()}` }, schema.text('York'))
    ]
  );

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  }

  return true;
};
