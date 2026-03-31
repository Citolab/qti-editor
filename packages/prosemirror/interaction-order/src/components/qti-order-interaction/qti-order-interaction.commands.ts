import { chainCommands, splitBlock } from 'prosemirror-commands';
import { createInsertSiblingOnEnterCommand } from '@qti-editor/interaction-shared/commands/enter.js';
import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { translateQti } from '@qti-editor/interaction-shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosekit/pm/view';

export const insertOrderInteraction: Command = (state, dispatch, view?: EditorView) => {
  const target = view?.dom ?? null;
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const choiceType = schema.nodes.qtiSimpleChoice;
      const choiceParagraphType = schema.nodes.qtiSimpleChoiceParagraph;
      const interactionType = schema.nodes.qtiOrderInteraction;

      if (!promptType || !promptParagraphType || !choiceType || !choiceParagraphType || !interactionType) {
        return null;
      }

      const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.order.default', { target })))
      );

      const choices = [
        choiceType.create({ identifier: `CHOICE_${crypto.randomUUID()}` }, choiceParagraphType.create(null, schema.text(translateQti('choice.itemA', { target })))),
        choiceType.create({ identifier: `CHOICE_${crypto.randomUUID()}` }, choiceParagraphType.create(null, schema.text(translateQti('choice.itemB', { target })))),
        choiceType.create({ identifier: `CHOICE_${crypto.randomUUID()}` }, choiceParagraphType.create(null, schema.text(translateQti('choice.itemC', { target })))),
      ];

      return interactionType.create({ responseIdentifier }, [prompt, ...choices]);
    },
    selectionOffset: 2,
  })(state, dispatch);
};

export const insertOrderChoiceOnEnter: Command = (state, dispatch) => {
  const choiceType = state.schema.nodes.qtiSimpleChoice;
  const paragraphType = state.schema.nodes.qtiSimpleChoiceParagraph;
  if (!choiceType || !paragraphType) return false;

  // Only act when inside a qtiOrderInteraction
  const { selection } = state;
  let insideOrder = false;
  for (let depth = selection.$from.depth; depth >= 0; depth--) {
    if (selection.$from.node(depth).type.name === 'qtiOrderInteraction') {
      insideOrder = true;
      break;
    }
  }
  if (!insideOrder) return false;

  return createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiSimpleChoice',
    selectionOffset: 2,
    createSiblingNode: () =>
      choiceType.create(
        { identifier: `CHOICE_${crypto.randomUUID()}` },
        paragraphType.create()
      ),
  })(state, dispatch);
};

export const qtiOrderEnterCommand: Command = chainCommands(insertOrderChoiceOnEnter, splitBlock);
