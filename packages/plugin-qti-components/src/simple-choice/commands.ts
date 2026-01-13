import { defineCommands } from 'prosekit/core';
import type { Command } from 'prosekit/pm/state';
import { TextSelection } from 'prosekit/pm/state';

/**
 * Command to insert a QTI simple choice
 */
export const insertQtiSimpleChoice: Command = (state, dispatch) => {
  const choiceNode = state.schema.nodes.qti_simple_choice?.create(
    { identifier: `choice_${Date.now()}` },
    state.schema.nodes.paragraph.create(null, state.schema.text('Choice option')),
  );
  if (!choiceNode) return false;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(choiceNode).scrollIntoView());
  return true;
};

/**
 * Command to split a simple choice at cursor position, creating a new sibling choice
 */
export const splitSimpleChoice: Command = (state, dispatch) => {
  const { $from } = state.selection;

  // Check if we're inside a qti_simple_choice
  let choiceDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'qti_simple_choice') {
      choiceDepth = d;
      break;
    }
  }

  if (choiceDepth === -1) {
    console.log('splitSimpleChoice: Not inside a qti_simple_choice');
    return false;
  }

  const choiceNode = $from.node(choiceDepth);
  const choiceEnd = $from.after(choiceDepth);

  // Check if cursor is at the end of the last block in the choice
  // Calculate position relative to the choice node
  const posInChoice = $from.pos - $from.start(choiceDepth);
  const choiceSize = choiceNode.content.size;
  const isAtEnd = posInChoice >= choiceSize - 1;

  console.log('splitSimpleChoice:', {
    posInChoice,
    choiceSize,
    isAtEnd,
    parentOffset: $from.parentOffset,
    parentSize: $from.parent.content.size,
  });

  if (!isAtEnd) {
    // Not at end - allow default behavior
    console.log('splitSimpleChoice: Not at end, allowing default behavior');
    return false;
  }

  console.log('splitSimpleChoice: At end, creating new choice');

  // At end - create a new simple choice after this one
  const newChoice = state.schema.nodes.qti_simple_choice.create(
    { identifier: `choice_${Date.now()}` },
    state.schema.nodes.paragraph.create(),
  );

  if (dispatch) {
    const tr = state.tr.insert(choiceEnd, newChoice);
    // Set selection to the start of the new choice's paragraph
    const newPos = choiceEnd + 2; // +1 for choice node, +1 to get inside paragraph
    const $pos = tr.doc.resolve(newPos);
    tr.setSelection(TextSelection.near($pos));
    dispatch(tr.scrollIntoView());
  }

  return true;
};

export const qtiSimpleChoiceCommands = defineCommands({
  insertQtiSimpleChoice: () => insertQtiSimpleChoice,
  splitSimpleChoice: () => splitSimpleChoice,
});
