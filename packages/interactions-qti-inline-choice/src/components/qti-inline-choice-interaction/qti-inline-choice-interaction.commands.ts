import { createInsertSiblingOnEnterCommand } from '@qti-editor/interactions-shared/commands/enter.js';

import type { Command } from 'prosemirror-state';

/**
 * Command to insert an inline choice interaction at the current selection.
 */
export const insertInlineChoiceInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const interactionType = schema.nodes.qtiInlineChoiceInteraction;
  const inlineChoiceType = schema.nodes.qtiInlineChoice;
  const inlineChoiceParagraphType = schema.nodes.qtiInlineChoiceParagraph;

  if (!interactionType || !inlineChoiceType || !inlineChoiceParagraphType) return false;

  const interaction = interactionType.create(
    {
      responseIdentifier: `RESPONSE_${crypto.randomUUID()}`,
      shuffle: false
    },
    [
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        inlineChoiceParagraphType.create(null, schema.text('Gloucester'))
      ),
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        inlineChoiceParagraphType.create(null, schema.text('Lancaster'))
      ),
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        inlineChoiceParagraphType.create(null, schema.text('York'))
      )
    ]
  );

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  }

  return true;
};

/**
 * Handles Enter inside qti-inline-choice paragraphs by inserting a new empty
 * sibling qti-inline-choice directly after the current one.
 */
export const insertInlineChoiceOnEnter: Command = (state, dispatch) => {
  const inlineChoiceType = state.schema.nodes.qtiInlineChoice;
  const paragraphType = state.schema.nodes.qtiInlineChoiceParagraph;
  if (!inlineChoiceType || !paragraphType) return false;

  return createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiInlineChoice',
    selectionOffset: 2,
    createSiblingNode: () =>
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        paragraphType.create()
      ),
  })(state, dispatch);
};
