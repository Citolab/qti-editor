/**
 * QTI Match Interaction Commands
 *
 * ProseMirror commands for inserting and manipulating match interactions.
 */

import { chainCommands, splitBlock } from 'prosemirror-commands';
import { createInsertSiblingOnEnterCommand } from '@qti-editor/interactions-shared/commands/enter.js';
import { createInsertBlockInteractionCommand } from '@qti-editor/interactions-shared/commands/insert.js';

import type { Command } from 'prosemirror-state';

/**
 * Command to insert a match interaction at the current selection
 */
export const insertMatchInteraction: Command = (state, dispatch) => {
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const matchSetType = schema.nodes.qtiSimpleMatchSet;
      const associableChoiceType = schema.nodes.qtiSimpleAssociableChoice;
      const associableChoiceParagraphType = schema.nodes.qtiSimpleAssociableChoiceParagraph;
      const interactionType = schema.nodes.qtiMatchInteraction;

      if (!promptType || !promptParagraphType || !matchSetType || !associableChoiceType || !associableChoiceParagraphType || !interactionType) {
        return null;
      }

      const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
      const prompt = promptType.create(null, promptParagraphType.create(null, schema.text('Match the items from the left column with the correct items on the right.')));

      // Create first match set (source choices)
      const sourceChoices = [
        associableChoiceType.create(
          { identifier: `SOURCE_${crypto.randomUUID()}`, matchMax: 1 },
          associableChoiceParagraphType.create(null, schema.text('Item A'))
        ),
        associableChoiceType.create(
          { identifier: `SOURCE_${crypto.randomUUID()}`, matchMax: 1 },
          associableChoiceParagraphType.create(null, schema.text('Item B'))
        ),
        associableChoiceType.create(
          { identifier: `SOURCE_${crypto.randomUUID()}`, matchMax: 1 },
          associableChoiceParagraphType.create(null, schema.text('Item C'))
        )
      ];
      const sourceMatchSet = matchSetType.create(null, sourceChoices);

      // Create second match set (target choices)
      const targetChoices = [
        associableChoiceType.create(
          { identifier: `TARGET_${crypto.randomUUID()}`, matchMax: 3 },
          associableChoiceParagraphType.create(null, schema.text('Option 1'))
        ),
        associableChoiceType.create(
          { identifier: `TARGET_${crypto.randomUUID()}`, matchMax: 3 },
          associableChoiceParagraphType.create(null, schema.text('Option 2'))
        ),
        associableChoiceType.create(
          { identifier: `TARGET_${crypto.randomUUID()}`, matchMax: 3 },
          associableChoiceParagraphType.create(null, schema.text('Option 3'))
        )
      ];
      const targetMatchSet = matchSetType.create(null, targetChoices);

      return interactionType.create({ responseIdentifier, maxAssociations: 3 }, [prompt, sourceMatchSet, targetMatchSet]);
    },
    selectionOffset: 2,
  })(state, dispatch);
};

/**
 * Handles Enter inside qti-simple-associable-choice paragraphs by inserting a new empty
 * sibling qti-simple-associable-choice directly after the current one.
 */
export const insertSimpleAssociableChoiceOnEnter: Command = (state, dispatch) => {
  const choiceType = state.schema.nodes.qtiSimpleAssociableChoice;
  const paragraphType = state.schema.nodes.qtiSimpleAssociableChoiceParagraph;
  if (!choiceType || !paragraphType) return false;

  return createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiSimpleAssociableChoice',
    selectionOffset: 2,
    createSiblingNode: () =>
      choiceType.create(
        { identifier: `CHOICE_${crypto.randomUUID()}`, matchMax: 1 },
        paragraphType.create()
      ),
  })(state, dispatch);
};

/**
 * Enter command chain for match interactions.
 * 1) Insert new associable choice when inside qti-simple-associable-choice.
 * 2) Fallback to regular block split behavior elsewhere.
 */
export const qtiMatchEnterCommand: Command = chainCommands(insertSimpleAssociableChoiceOnEnter, splitBlock);
