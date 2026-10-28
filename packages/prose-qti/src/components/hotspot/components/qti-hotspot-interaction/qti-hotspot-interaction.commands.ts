import { createInsertBlockInteractionCommand } from '@citolab/prose-qti/components/shared/commands/insert.js';
import { translateQti } from '@citolab/prose-qti/components/shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/**
 * Insert a hotspot interaction at the current selection: a prompt and an empty picture. The author
 * adds the image and draws the choices in the interaction's own editor.
 */
export const insertHotspotInteraction: Command = (state, dispatch, view?: EditorView) => {
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const interactionType = schema.nodes.qtiHotspotInteraction;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const imageType = schema.nodes.imgHotspot;

      if (!interactionType || !promptType || !promptParagraphType || !imageType) return null;

      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.hotspot.default', { target: view?.dom ?? null }))),
      );

      return interactionType.create(
        { responseIdentifier: `RESPONSE_${crypto.randomUUID()}`, maxChoices: 1 },
        [prompt, imageType.create()],
      );
    },
    selectionOffset: 2,
  })(state, dispatch);
};
