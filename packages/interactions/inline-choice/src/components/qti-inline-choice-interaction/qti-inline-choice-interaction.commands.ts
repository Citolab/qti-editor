import { NodeSelection, TextSelection } from 'prosemirror-state';

import type { Command } from 'prosemirror-state';

function isSelectionInsideInlineChoiceInteraction(state: Parameters<Command>[0]): boolean {
  const interactionType = state.schema.nodes.qtiInlineChoiceInteraction;
  if (!interactionType) return false;

  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type === interactionType) {
      return true;
    }
  }

  return false;
}

/**
 * Command to insert an inline choice interaction at the current selection.
 */
export const insertInlineChoiceInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const interactionType = schema.nodes.qtiInlineChoiceInteraction;
  const inlineChoiceType = schema.nodes.qtiInlineChoice;

  if (!interactionType || !inlineChoiceType) return false;
  if (isSelectionInsideInlineChoiceInteraction(state)) return false;

  const interaction = interactionType.create(
    {
      responseIdentifier: `RESPONSE_${crypto.randomUUID()}`,
      shuffle: false
    },
    [
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        schema.text('Gloucester')
      ),
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        schema.text('Lancaster')
      ),
      inlineChoiceType.create(
        { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
        schema.text('York')
      )
    ]
  );

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  }

  return true;
};

/**
 * Handles Enter inside qti-inline-choice by inserting a new sibling
 * qti-inline-choice after the current one.
 *
 * A non-breaking space placeholder is used so ProseMirror has a real text
 * node to anchor the cursor to (empty inline nodes have no DOM text node,
 * so the browser can't place a caret inside them). The placeholder is
 * selected as a range so typing immediately replaces it.
 */
export const insertInlineChoiceOnEnter: Command = (state, dispatch) => {
  const inlineChoiceType = state.schema.nodes.qtiInlineChoice;
  if (!inlineChoiceType) return false;

  const { selection } = state;
  if (!selection.empty) return false;

  const { $from } = selection;
  let ancestorDepth = -1;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type.name === 'qtiInlineChoice') {
      ancestorDepth = depth;
      break;
    }
  }
  if (ancestorDepth < 0) return false;
  console.log('[inline-choice Enter] inserting new choice after depth', ancestorDepth, 'dispatch?', !!dispatch);
  if (!dispatch) return true;

  const insertPos = $from.after(ancestorDepth);
  const newNode = inlineChoiceType.create(
    { identifier: `INLINE_CHOICE_${crypto.randomUUID()}` },
    state.schema.text(' '),
  );
  const tr = state.tr.insert(insertPos, newNode);
  // Select the placeholder NBSP so typing replaces it immediately.
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1, insertPos + 2)).scrollIntoView();
  dispatch(tr);
  return true;
};

/**
 * Handles Backspace inside a qtiInlineChoiceInteraction:
 *
 * - NodeSelection on a choice → delete it (blocked if it's the only one).
 * - Cursor at start of a NON-FIRST choice → navigate to end of previous
 *   choice. Prevents ProseMirror's default joinBackward from merging two
 *   discrete option nodes together.
 * - Cursor at start of FIRST choice → fall through (isolating parent blocks
 *   the default joinBackward anyway).
 * - Cursor at start of an EMPTY choice → delete the choice. This is a
 *   fallback; appendTransaction in the plugin removes empty choices before
 *   a second keypress is needed in most cases.
 * - Cursor in the interaction node between choices (happens when the browser
 *   ejects the cursor from a just-emptied inline element before appendTransaction
 *   runs) → navigate into the adjacent choice.
 * - Cursor elsewhere → fall through so the default char-delete runs.
 */
export const deleteInlineChoiceOnBackspace: Command = (state, dispatch) => {
  const { selection, schema } = state;
  const inlineChoiceType = schema.nodes.qtiInlineChoice;
  const interactionType = schema.nodes.qtiInlineChoiceInteraction;
  if (!inlineChoiceType || !interactionType) return false;

  const { $from } = selection;
  console.log('[inline-choice Backspace] selectionType:', selection.constructor.name,
    'empty:', selection.empty,
    'parentType:', $from.parent.type.name,
    'parentOffset:', $from.parentOffset,
    'parentContentSize:', $from.parent.content.size,
    'nodeBefore:', $from.nodeBefore?.type.name ?? 'null',
    'nodeAfter:', $from.nodeAfter?.type.name ?? 'null',
  );

  // NodeSelection: delete the whole selected choice.
  if (selection instanceof NodeSelection && selection.node.type === inlineChoiceType) {
    if ($from.parent.type !== interactionType) return false;
    if ($from.parent.childCount <= 1) return false;
    if (!dispatch) return true;

    const nodePos = selection.from;
    const nodeSize = selection.node.nodeSize;
    const choiceIndex = $from.index($from.depth);
    const tr = state.tr.delete(nodePos, nodePos + nodeSize);
    const newPos = choiceIndex > 0 ? nodePos - 1 : nodePos + 1;
    tr.setSelection(TextSelection.create(tr.doc, newPos));
    dispatch(tr.scrollIntoView());
    return true;
  }

  if (!selection.empty) return false;

  // Cursor directly inside a qtiInlineChoice at position 0.
  if ($from.parent.type === inlineChoiceType && $from.parentOffset === 0) {
    const interactionNode = $from.node($from.depth - 1);
    if (interactionNode.type !== interactionType) return false;

    const choiceIndex = $from.index($from.depth - 1);

    // Empty choice: delete it.
    if ($from.parent.content.size === 0) {
      if (interactionNode.childCount <= 1) return false;
      if (!dispatch) return true;
      const choiceStart = $from.before($from.depth);
      const tr = state.tr.delete(choiceStart, choiceStart + $from.parent.nodeSize);
      const newPos = choiceIndex > 0 ? choiceStart - 1 : choiceStart + 1;
      tr.setSelection(TextSelection.create(tr.doc, newPos));
      dispatch(tr.scrollIntoView());
      return true;
    }

    // Non-empty choice, not the first: navigate to end of previous choice.
    if (choiceIndex > 0) {
      if (!dispatch) return true;
      const choiceStart = $from.before($from.depth);
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, choiceStart - 1)).scrollIntoView());
      return true;
    }

    // First non-empty choice: fall through (isolating parent stops the default join).
    return false;
  }

  // Cursor landed in the interaction node itself — the browser ejected it from
  // an empty inline element before appendTransaction could clean it up.
  if ($from.parent.type === interactionType) {
    const nodeBefore = $from.nodeBefore;

    if (nodeBefore && nodeBefore.type === inlineChoiceType) {
      if (nodeBefore.content.size === 0) {
        // Adjacent empty choice: delete it.
        if ($from.parent.childCount <= 1) return false;
        if (!dispatch) return true;
        const emptyEnd = $from.pos;
        const emptyStart = emptyEnd - nodeBefore.nodeSize;
        // choiceIndex is index of the node AFTER the cursor
        const choiceIndex = $from.index($from.depth);
        const tr = state.tr.delete(emptyStart, emptyEnd);
        // choiceIndex > 1 means there's a non-deleted choice before the empty one
        const newPos = choiceIndex > 1 ? emptyStart - 1 : emptyStart + 1;
        tr.setSelection(TextSelection.create(tr.doc, newPos));
        dispatch(tr.scrollIntoView());
        return true;
      }

      // Non-empty choice to the left: move cursor into it.
      if (!dispatch) return true;
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, $from.pos - 1)).scrollIntoView());
      return true;
    }
  }

  return false;
};
