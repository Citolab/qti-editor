import { TextSelection } from 'prosemirror-state';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';

type CreateNode = (state: EditorState) => ProseMirrorNode | null;

export type InsertBlockInteractionCommandOptions = {
  createNode: CreateNode;
  selectionOffset?: number;
};

function findNearestBlockInteractionDepth(state: EditorState): number {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.isBlock && node.type.name.endsWith('Interaction')) return depth;
  }
  return -1;
}

/**
 * Generic block insertion command:
 * - outside interactions: replace current selection (default behavior)
 * - inside a block interaction: insert as sibling right after that interaction
 */
export function createInsertBlockInteractionCommand(
  options: InsertBlockInteractionCommandOptions
): Command {
  const { createNode, selectionOffset = 1 } = options;

  return (state, dispatch) => {
    const node = createNode(state);
    if (!node) return false;

    const interactionDepth = findNearestBlockInteractionDepth(state);

    if (!dispatch) return true;

    if (interactionDepth >= 0) {
      const insertPos = state.selection.$from.after(interactionDepth);
      const tr = state.tr.insert(insertPos, node);
      tr.setSelection(TextSelection.create(tr.doc, insertPos + selectionOffset)).scrollIntoView();
      dispatch(tr);
      return true;
    }

    dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
    return true;
  };
}
