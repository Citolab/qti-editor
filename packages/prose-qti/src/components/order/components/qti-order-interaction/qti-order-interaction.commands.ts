import { chainCommands, splitBlock } from 'prosemirror-commands';

import { createInsertSiblingOnEnterCommand } from '../../../shared/commands/enter.js';
import { createInsertBlockInteractionCommand } from '../../../shared/commands/insert.js';
import { translateQti } from '../../../shared';
import { createIdentifierMinter } from '../../../shared/identifiers/identifier-strategy.js';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

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

      const minter = createIdentifierMinter(currentState);
      const responseIdentifier = minter.responseIdentifier('qti-order-interaction');
      const choiceIdentifier = minter.forInteraction('qti-order-interaction');
      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.order.default', { target })))
      );

      const choices = [
        choiceType.create({ identifier: choiceIdentifier('choice', 'CHOICE') }, choiceParagraphType.create(null, schema.text(translateQti('choice.itemA', { target })))),
        choiceType.create({ identifier: choiceIdentifier('choice', 'CHOICE') }, choiceParagraphType.create(null, schema.text(translateQti('choice.itemB', { target })))),
        choiceType.create({ identifier: choiceIdentifier('choice', 'CHOICE') }, choiceParagraphType.create(null, schema.text(translateQti('choice.itemC', { target })))),
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
  let orderInteraction: ProseMirrorNode | null = null;
  for (let depth = selection.$from.depth; depth >= 0; depth--) {
    if (selection.$from.node(depth).type.name === 'qtiOrderInteraction') {
      orderInteraction = selection.$from.node(depth);
      break;
    }
  }
  if (!orderInteraction) return false;

  return createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiSimpleChoice',
    selectionOffset: 2,
    createSiblingNode: currentState =>
      choiceType.create(
        {
          identifier: createIdentifierMinter(currentState).forInteraction('qti-order-interaction', orderInteraction)(
            'choice',
            'CHOICE',
          ),
        },
        paragraphType.create()
      ),
  })(state, dispatch);
};

export const qtiOrderEnterCommand: Command = chainCommands(insertOrderChoiceOnEnter, splitBlock);
