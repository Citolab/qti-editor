/**
 * QTI Match Interaction Commands
 *
 * ProseMirror commands for inserting and manipulating match interactions.
 */

import { TextSelection } from 'prosemirror-state';
import { chainCommands, splitBlock } from 'prosemirror-commands';
import { createInsertBlockInteractionCommand } from '@qti-editor/interaction-shared/commands/insert.js';
import { translateQti } from '@qti-editor/interaction-shared';

import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosekit/pm/view';

/**
 * Command to insert a match interaction at the current selection
 */
export const insertMatchInteraction: Command = (state, dispatch, view?: EditorView) => {
  const target = view?.dom ?? null;
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
      const prompt = promptType.create(
        null,
        promptParagraphType.create(null, schema.text(translateQti('prompt.match.default', { target }))),
      );

      // Create first match set (source choices)
      const sourceChoices = [
        associableChoiceType.create(
          { identifier: `SOURCE_${crypto.randomUUID()}`, matchMax: 1 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.itemA', { target })))
        ),
        associableChoiceType.create(
          { identifier: `SOURCE_${crypto.randomUUID()}`, matchMax: 1 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.itemB', { target })))
        ),
        associableChoiceType.create(
          { identifier: `SOURCE_${crypto.randomUUID()}`, matchMax: 1 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.itemC', { target })))
        )
      ];
      const sourceMatchSet = matchSetType.create(null, sourceChoices);

      // Create second match set (target choices)
      const targetChoices = [
        associableChoiceType.create(
          { identifier: `TARGET_${crypto.randomUUID()}`, matchMax: 3 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.option1', { target })))
        ),
        associableChoiceType.create(
          { identifier: `TARGET_${crypto.randomUUID()}`, matchMax: 3 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.option2', { target })))
        ),
        associableChoiceType.create(
          { identifier: `TARGET_${crypto.randomUUID()}`, matchMax: 3 },
          associableChoiceParagraphType.create(null, schema.text(translateQti('choice.option3', { target })))
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
 * When inserting in the source set (index 0), also appends a new choice to the target set.
 */
export const insertSimpleAssociableChoiceOnEnter: Command = (state, dispatch) => {
  const choiceType = state.schema.nodes.qtiSimpleAssociableChoice;
  const paragraphType = state.schema.nodes.qtiSimpleAssociableChoiceParagraph;
  const matchSetType = state.schema.nodes.qtiSimpleMatchSet;
  const interactionType = state.schema.nodes.qtiMatchInteraction;
  if (!choiceType || !paragraphType) return false;

  const { selection } = state;
  if (!selection.empty) return false;

  // Find the enclosing qtiSimpleAssociableChoice
  let choiceDepth = -1;
  for (let depth = selection.$from.depth; depth >= 0; depth--) {
    if (selection.$from.node(depth).type === choiceType) { choiceDepth = depth; break; }
  }
  if (choiceDepth < 0) return false;

  // Determine source vs target set and locate the interaction node
  let isSourceSet = false;
  let interactionDepth = -1;
  if (matchSetType && interactionType) {
    for (let depth = selection.$from.depth; depth >= 0; depth--) {
      if (selection.$from.node(depth).type === matchSetType) {
        const parentDepth = depth - 1;
        if (parentDepth >= 0 && selection.$from.node(parentDepth).type === interactionType) {
          isSourceSet = selection.$from.index(parentDepth) === 0;
          interactionDepth = parentDepth;
        }
        break;
      }
    }
  }

  if (!dispatch) return true;

  const sourceInsertPos = selection.$from.after(choiceDepth);
  const sourceSibling = choiceType.create(
    { identifier: `${isSourceSet ? 'SOURCE' : 'TARGET'}_${crypto.randomUUID()}`, matchMax: 1 },
    paragraphType.create()
  );

  const tr = state.tr.insert(sourceInsertPos, sourceSibling);
  tr.setSelection(TextSelection.create(tr.doc, sourceInsertPos + 2)).scrollIntoView();

  // When adding to source set, also append a matching target choice
  if (isSourceSet && interactionDepth >= 0 && matchSetType) {
    const originalInteractionPos = selection.$from.before(interactionDepth);
    const mappedInteractionPos = tr.mapping.map(originalInteractionPos);
    const interactionNodeNew = tr.doc.nodeAt(mappedInteractionPos);
    if (interactionNodeNew) {
      let setCount = 0;
      interactionNodeNew.forEach((child, childOffset) => {
        if (child.type === matchSetType) {
          setCount++;
          if (setCount === 2) {
            const targetChoice = choiceType.create(
              { identifier: `TARGET_${crypto.randomUUID()}`, matchMax: 3 },
              paragraphType.create()
            );
            // Insert before the closing tag of the target set
            const insertAt = mappedInteractionPos + 1 + childOffset + child.nodeSize - 1;
            tr.insert(insertAt, targetChoice);
          }
        }
      });
    }
  }

  dispatch(tr);
  return true;
};

/**
 * Enter command chain for match interactions.
 * 1) Insert new associable choice when inside qti-simple-associable-choice.
 * 2) Fallback to regular block split behavior elsewhere.
 */
export const qtiMatchEnterCommand: Command = chainCommands(insertSimpleAssociableChoiceOnEnter, splitBlock);
