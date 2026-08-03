import { createInsertSiblingOnEnterCommand } from '@citolab/prose-qti/components/shared/commands/enter.js';
import { createInsertBlockInteractionCommand } from '@citolab/prose-qti/components/shared/commands/insert.js';
import { translateQti } from '@citolab/prose-qti/components/shared';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/**
 * An empty `qtiSimpleChoice` with a fresh identifier.
 *
 * Exported because a choice can be added by more than one route — Enter at the end of a choice, and
 * a host's own affordance such as an "add answer" decoration — and those routes must produce
 * structurally identical nodes. When this was inlined in the Enter handler, the second route had to
 * reimplement it, and "same attrs, same shape" became a comment someone had to honour rather than
 * something the code guaranteed.
 *
 * Deliberately a node factory rather than a command: the two routes agree on WHAT a new choice is
 * and differ on WHERE it goes. Enter also has to handle exiting the interaction on an empty
 * trailing choice, which an insert-at-position caller has no notion of, so sharing a whole command
 * would force one caller into the other's shape.
 */
export function createSimpleChoiceNode(schema: Schema): ProseMirrorNode | null {
  const choiceType = schema.nodes.qtiSimpleChoice;
  const paragraphType = schema.nodes.qtiSimpleChoiceParagraph;
  if (!choiceType || !paragraphType) return null;

  return choiceType.create({ identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` }, paragraphType.create());
}

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
    createSiblingNode: currentState => createSimpleChoiceNode(currentState.schema),
    // Enter on an empty trailing choice exits the interaction into a new
    // paragraph below it, instead of adding another empty choice.
    createExitNode: currentState => currentState.schema.nodes.paragraph?.create() ?? null,
  })(state, dispatch);
};

/**
 * Enter command for choice interactions.
 * Inserts new simple choice when inside qti-simple-choice.
 */
export const qtiChoiceEnterCommand: Command = insertSimpleChoiceOnEnter;
