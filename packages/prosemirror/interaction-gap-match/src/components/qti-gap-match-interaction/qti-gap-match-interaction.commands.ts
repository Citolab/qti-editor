import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { createInsertSiblingOnEnterCommand } from '@qti-editor/interaction-shared/commands/enter.js';
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

/**
 * Handles Enter inside qti-gap-text by inserting a new empty sibling gap-text.
 */
export const insertGapTextOnEnter: Command = (state, dispatch) => {
  const gapTextType = state.schema.nodes.qtiGapText;
  if (!gapTextType) {
    return false;
  }

  const result = createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiGapText',
    selectionOffset: 1,
    createSiblingNode: () =>
      gapTextType.create(
        { identifier: `GAP_TEXT_${crypto.randomUUID()}`, matchMax: 1 },
      ),
  })(state, dispatch);

  return result;
};

/**
 * Enter command for gap-match interaction.
 * Inserts new gap-text when inside qti-gap-text.
 */
export const qtiGapMatchEnterCommand: Command = insertGapTextOnEnter;

/**
 * Insert a qti-gap inline element at the cursor position.
 * Only works when inside a gap-match interaction.
 */
export const insertGap: Command = (state, dispatch) => {
  const { selection, schema } = state;
  const gapType = schema.nodes.qtiGap;
  const gapMatchType = schema.nodes.qtiGapMatchInteraction;
  
  if (!gapType || !gapMatchType) return false;

  // Check if we're inside a gap-match interaction
  const { $from } = selection;
  let insideGapMatch = false;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type === gapMatchType) {
      insideGapMatch = true;
      break;
    }
  }
  
  if (!insideGapMatch) return false;

  // Check if we can insert an inline node here
  if (!$from.parent.type.inlineContent) return false;

  if (!dispatch) return true;

  const gap = gapType.create({ identifier: `GAP_${crypto.randomUUID()}` });
  const tr = state.tr.replaceSelectionWith(gap);
  dispatch(tr);
  return true;
};
