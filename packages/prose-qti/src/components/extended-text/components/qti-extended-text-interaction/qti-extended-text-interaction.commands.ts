/**
 * QTI Extended Text Interaction Commands
 *
 * ProseMirror commands for inserting extended text interactions.
 */

import { createInsertBlockInteractionCommand } from '../../../shared/commands/insert.js';
import { translateQti } from '../../../shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/**
 * Command to insert an extended text interaction at the current selection
 */
export const insertExtendedTextInteraction: Command = (state, dispatch, view?: EditorView) => {
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const interactionType = schema.nodes.qtiExtendedTextInteraction;

      if (!promptType || !promptParagraphType || !interactionType) {
        return null;
      }

      const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.extendedText.default', { target: view?.dom ?? null }))),
      );

      return interactionType.create(
        {
          responseIdentifier,
          class: 'qti-height-lines-6'
        },
        [prompt]
      );
    },
    selectionOffset: 2,
  })(state, dispatch);
};
