import { TextSelection } from 'prosemirror-state';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Command, EditorState, Selection } from 'prosemirror-state';

type CreateSiblingNode = (state: EditorState) => ProseMirrorNode | null;

export type InsertSiblingOnEnterOptions = {
  ancestorNodeName: string;
  createSiblingNode: CreateSiblingNode;
  selectionOffset?: number;
};

function findAncestorDepth(selection: Selection, nodeName: string): number {
  for (let depth = selection.$from.depth; depth >= 0; depth -= 1) {
    if (selection.$from.node(depth).type.name === nodeName) return depth;
  }
  return -1;
}

/**
 * Generic Enter-handler factory:
 * inserts a sibling node after the active ancestor and places the cursor
 * into the inserted node at a configurable offset.
 */
export function createInsertSiblingOnEnterCommand(options: InsertSiblingOnEnterOptions): Command {
  const { ancestorNodeName, createSiblingNode, selectionOffset = 2 } = options;

  return (state, dispatch) => {
    const { selection } = state;
    if (!selection.empty) return false;

    const ancestorDepth = findAncestorDepth(selection, ancestorNodeName);
    if (ancestorDepth < 0) return false;

    const siblingNode = createSiblingNode(state);
    if (!siblingNode) return false;

    const insertPos = selection.$from.after(ancestorDepth);
    if (!dispatch) return true;

    const tr = state.tr.insert(insertPos, siblingNode);
    tr.setSelection(TextSelection.create(tr.doc, insertPos + selectionOffset)).scrollIntoView();
    dispatch(tr);
    return true;
  };
}
