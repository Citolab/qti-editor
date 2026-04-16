import { createInsertSiblingOnEnterCommand } from '@qti-editor/interaction-shared/commands/enter.js';

import type { Command } from 'prosemirror-state';

function isSelectionInsideInlineChoiceInteraction(state: Parameters<Command>[0]): boolean {
  const interactionType = state.schema.nodes.qtiInlineChoiceInteraction;
  if (!interactionType) return false;

  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type === interactionType) {
      return true;
    }
  }

  return false;
}

/**
 * Command to insert an inline choice interaction at the current selection.
 */
export const insertInlineChoiceInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const interactionType = schema.nodes.qtiInlineChoiceInteraction;
  const inlineChoiceType = schema.nodes.qtiInlineChoice;

  if (!interactionType || !inlineChoiceType) return false;
  if (isSelectionInsideInlineChoiceInteraction(state)) return false;

  const interaction = interactionType.create(
    {
      responseIdentifier: `RESPONSE_${crypto.randomUUID()}`,
      shuffle: false
    },
    [
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        schema.text('Gloucester')
      ),
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        schema.text('Lancaster')
      ),
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        schema.text('York')
      )
    ]
  );

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  }

  return true;
};

/**
 * Handles Enter inside qti-inline-choice by inserting a new empty
 * sibling qti-inline-choice directly after the current one.
 */
export const insertInlineChoiceOnEnter: Command = (state, dispatch) => {
  const inlineChoiceType = state.schema.nodes.qtiInlineChoice;
  if (!inlineChoiceType) return false;

  return createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiInlineChoice',
    selectionOffset: 1,
    createSiblingNode: () =>
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` }
      ),
  })(state, dispatch);
};
