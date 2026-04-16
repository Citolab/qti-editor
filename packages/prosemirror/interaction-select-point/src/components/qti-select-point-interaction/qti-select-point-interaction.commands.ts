import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { translateQti } from '@qti-editor/interaction-shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/**
 * Command to insert a select point interaction at the current selection.
 */
export const insertSelectPointInteraction: Command = (state, dispatch, view?: EditorView) => {
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const interactionType = schema.nodes.qtiSelectPointInteraction;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const imgSelectPointType = schema.nodes.imgSelectPoint;

      if (!interactionType || !promptType || !promptParagraphType || !imgSelectPointType) return null;

      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.selectPoint.default', { target: view?.dom ?? null }))),
      );
      const imgSelectPoint = imgSelectPointType.create();

      return interactionType.create({
        responseIdentifier: `RESPONSE_${crypto.randomUUID()}`,
        maxChoices: 0,
        minChoices: 0,
        areaMappings: '[]',
      }, [prompt, imgSelectPoint]);
    },
    selectionOffset: 2,
  })(state, dispatch);
};
