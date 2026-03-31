import { chainCommands, splitBlock } from 'prosemirror-commands';
import { createInsertSiblingOnEnterCommand } from '@qti-editor/interaction-shared/commands/enter.js';
import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { translateQti } from '@qti-editor/interaction-shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosekit/pm/view';

/**
 * Command to insert a choice interaction at the current selection
 */
export const insertChoiceInteraction: Command = (state, dispatch, view?: EditorView) => {
  const target = view?.dom ?? null;
  return createInsertBlockInteractionCommand({
    createNode: currentState => {
      const { schema } = currentState;
      const promptType = schema.nodes.qtiPrompt;
      const promptParagraphType = schema.nodes.qtiPromptParagraph;
      const choiceType = schema.nodes.qtiSimpleChoice;
      const choiceParagraphType = schema.nodes.qtiSimpleChoiceParagraph;
      const interactionType = schema.nodes.qtiChoiceInteraction;

      if (!promptType || !promptParagraphType || !choiceType || !choiceParagraphType || !interactionType) {
        return null;
      }

      const responseIdentifier = `RESPONSE_${crypto.randomUUID()}`;
      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.choice.default', { target }))),
      );

      const choices = [
        choiceType.create(
          { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
          choiceParagraphType.create(null, schema.text(translateQti('choice.optionA', { target })))
        ),
        choiceType.create(
          { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
          choiceParagraphType.create(null, schema.text(translateQti('choice.optionB', { target })))
        ),
        choiceType.create(
          { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
          choiceParagraphType.create(null, schema.text(translateQti('choice.optionC', { target })))
        )
      ];

      return interactionType.create({ responseIdentifier, maxChoices: 1 }, [prompt, ...choices]);
    },
    selectionOffset: 2,
  })(state, dispatch);
};

/**
 * Handles Enter inside qti-simple-choice paragraphs by inserting a new empty
 * sibling qti-simple-choice directly after the current one.
 */
export const insertSimpleChoiceOnEnter: Command = (state, dispatch) => {
  const choiceType = state.schema.nodes.qtiSimpleChoice;
  const paragraphType = state.schema.nodes.qtiSimpleChoiceParagraph;
  if (!choiceType || !paragraphType) return false;

  return createInsertSiblingOnEnterCommand({
    ancestorNodeName: 'qtiSimpleChoice',
    selectionOffset: 2,
    createSiblingNode: () =>
      choiceType.create(
        { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
        paragraphType.create()
      ),
  })(state, dispatch);
};

/**
 * Enter command chain for choice interactions.
 * 1) Insert new simple choice when inside qti-simple-choice.
 * 2) Fallback to regular block split behavior elsewhere.
 */
export const qtiChoiceEnterCommand: Command = chainCommands(insertSimpleChoiceOnEnter, splitBlock);
