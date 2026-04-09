/**
 * QTI Associate Interaction Commands
 *
 * ProseMirror commands for inserting and manipulating associate interactions.
 */

import { chainCommands, splitBlock } from 'prosemirror-commands';
import { createInsertSiblingOnEnterCommand } from '@qti-editor/interaction-shared/commands/enter.js';
import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { translateQti } from '@qti-editor/interaction-shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosekit/pm/view';

/**
 * Command to insert an associate interaction at the current selection
 */
export const insertAssociateInteraction: Command = (state, dispatch, view?: EditorView) => {
  const target = view?.dom ?? null;
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const associableChoiceType = schema.nodes.qtiSimpleAssociableChoice;
      const associableChoiceParagraphType = schema.nodes.qtiSimpleAssociableChoiceParagraph;
      const interactionType = schema.nodes.qtiAssociateInteraction;

      if (!promptType || !promptParagraphType || !associableChoiceType || !associableChoiceParagraphType || !interactionType) {
        return null;
      }

      const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.associate.default', { target }))),
      );

      const choices = [
        associableChoiceType.create(
          { identifier: `CHOICE_${crypto.randomUUID()}`, matchMax: 2 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.itemA', { target })))
        ),
        associableChoiceType.create(
          { identifier: `CHOICE_${crypto.randomUUID()}`, matchMax: 2 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.itemB', { target })))
        ),
        associableChoiceType.create(
          { identifier: `CHOICE_${crypto.randomUUID()}`, matchMax: 2 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.itemC', { target })))
        ),
        associableChoiceType.create(
          { identifier: `CHOICE_${crypto.randomUUID()}`, matchMax: 2 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.option1', { target })))
        ),
      ];

      return interactionType.create({ responseIdentifier, maxAssociations: 3 }, [prompt, ...choices]);
    },
    selectionOffset: 2,
  })(state, dispatch);
};

/**
 * Handles Enter inside qti-simple-associable-choice paragraphs by inserting a new empty
 * sibling qti-simple-associable-choice directly after the current one.
 */
export const insertAssociableChoiceOnEnter: Command = (state, dispatch) => {
  const choiceType = state.schema.nodes.qtiSimpleAssociableChoice;
  const paragraphType = state.schema.nodes.qtiSimpleAssociableChoiceParagraph;
  const interactionType = state.schema.nodes.qtiAssociateInteraction;
  if (!choiceType || !paragraphType || !interactionType) return false;

  // Only handle enter when inside qtiAssociateInteraction
  const { selection } = state;
  let insideAssociate = false;
  for (let depth = selection.$from.depth; depth >= 0; depth--) {
    if (selection.$from.node(depth).type === interactionType) {
      insideAssociate = true;
      break;
    }
  }
  if (!insideAssociate) return false;

  return createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiSimpleAssociableChoice',
    selectionOffset: 2,
    createSiblingNode: () =>
      choiceType.create(
        { identifier: `CHOICE_${crypto.randomUUID()}`, matchMax: 2 },
        paragraphType.create()
      ),
  })(state, dispatch);
};

/**
 * Enter command chain for associate interactions.
 * 1) Insert new associable choice when inside qti-associate-interaction.
 * 2) Fallback to regular block split behavior elsewhere.
 */
export const qtiAssociateEnterCommand: Command = chainCommands(insertAssociableChoiceOnEnter, splitBlock);
