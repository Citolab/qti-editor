import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { translateQti } from '@qti-editor/interaction-shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const insertGapMatchInteraction: Command = (state, dispatch, view?: EditorView) => {
  const target = view?.dom ?? null;
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const interactionType = schema.nodes.qtiGapMatchInteraction;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const gapTextType = schema.nodes.qtiGapText;
      const paragraphType = schema.nodes.paragraph;
      const gapType = schema.nodes.qtiGap;

      if (!interactionType || !promptType || !promptParagraphType || !gapTextType || !paragraphType || !gapType) {
        return null;
      }

      const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.gapMatch.default', { target }))),
      );

      const texts = [
        gapTextType.create(
          { identifier: `GAP_TEXT_${crypto.randomUUID()}`, matchMax: 1 },
          schema.text(translateQti('gapMatch.text.paris', { target })),
        ),
        gapTextType.create(
          { identifier: `GAP_TEXT_${crypto.randomUUID()}`, matchMax: 1 },
          schema.text(translateQti('gapMatch.text.madrid', { target })),
        ),
        gapTextType.create(
          { identifier: `GAP_TEXT_${crypto.randomUUID()}`, matchMax: 1 },
          schema.text(translateQti('gapMatch.text.rome', { target })),
        ),
      ];

      const firstGap = gapType.create({ identifier: `GAP_${crypto.randomUUID()}` });
      const secondGap = gapType.create({ identifier: `GAP_${crypto.randomUUID()}` });

      const firstSentence = paragraphType.create(null, [
        schema.text(translateQti('gapMatch.sample.beforeFrance', { target })),
        firstGap,
        schema.text(translateQti('gapMatch.sample.afterFrance', { target })),
      ]);
      const secondSentence = paragraphType.create(null, [
        schema.text(translateQti('gapMatch.sample.beforeSpain', { target })),
        secondGap,
        schema.text(translateQti('gapMatch.sample.afterSpain', { target })),
      ]);

      return interactionType.create(
        { responseIdentifier, maxAssociations: 2 },
        [prompt, ...texts, firstSentence, secondSentence],
      );
    },
    selectionOffset: 2,
  })(state, dispatch);
};
