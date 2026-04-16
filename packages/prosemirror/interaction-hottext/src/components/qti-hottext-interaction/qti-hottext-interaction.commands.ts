import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { translateQti } from '@qti-editor/interaction-shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const insertHottextInteraction: Command = (state, dispatch, view?: EditorView) => {
  const target = view?.dom ?? null;

  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const interactionType = schema.nodes.qtiHottextInteraction;
      const hottextType = schema.nodes.qtiHottext;
      const paragraphType = schema.nodes.paragraph;

      if (!interactionType || !hottextType || !paragraphType) {
        return null;
      }

      const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
      const paragraph = paragraphType.create(null, [
        schema.text(`${translateQti('prompt.hottext.before', { target })} `),
        hottextType.create(
          { identifier: `HOTTEXT_${crypto.randomUUID()}` },
          schema.text(translateQti('prompt.hottext.choiceA', { target })),
        ),
        schema.text(` ${translateQti('prompt.hottext.between', { target })} `),
        hottextType.create(
          { identifier: `HOTTEXT_${crypto.randomUUID()}` },
          schema.text(translateQti('prompt.hottext.choiceB', { target })),
        ),
        schema.text(` ${translateQti('prompt.hottext.after', { target })}`),
      ]);

      return interactionType.create(
        {
          responseIdentifier,
          maxChoices: 1,
        },
        [paragraph],
      );
    },
    selectionOffset: 2,
  })(state, dispatch);
};
