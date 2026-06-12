import { TextSelection } from 'prosemirror-state';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Command, EditorState, Selection } from 'prosemirror-state';

type CreateSiblingNode = (state: EditorState) => ProseMirrorNode | null;

export type InsertSiblingOnEnterOptions = {
  ancestorNodeName: string;
  createSiblingNode: CreateSiblingNode;
  selectionOffset?: number;
  /**
   * When provided, pressing Enter inside an empty ancestor that is the last
   * child of its parent (the interaction) "exits the list": the empty ancestor
   * is removed and this node is inserted right after the parent, with the
   * cursor placed inside it — like pressing Enter on an empty trailing list
   * item to escape into a new paragraph below the list.
   *
   * Only triggers while the parent keeps at least `minSiblings` children.
   */
  createExitNode?: CreateSiblingNode;
  /** Minimum number of siblings to keep when `createExitNode` is set. */
  minSiblings?: number;
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
  const { ancestorNodeName, createSiblingNode, selectionOffset = 2, createExitNode, minSiblings = 1 } = options;

  return (state, dispatch) => {
    const { selection } = state;
    
    if (!selection.empty) {
      return false;
    }

    const ancestorDepth = findAncestorDepth(selection, ancestorNodeName);
    
    if (ancestorDepth < 0) {
      return false;
    }

    // List-item style "exit": when the active ancestor is empty and is the last
    // child of its parent (the interaction), Enter removes the empty ancestor
    // and drops a new node (e.g. a paragraph) right after the interaction, with
    // the cursor inside it — escaping the list instead of adding another empty
    // sibling. Only fires while the parent keeps at least `minSiblings`.
    if (createExitNode) {
      const ancestor = selection.$from.node(ancestorDepth);
      const parent = selection.$from.node(ancestorDepth - 1);
      const indexInParent = selection.$from.index(ancestorDepth - 1);
      const isLastChild = indexInParent === parent.childCount - 1;

      if (ancestor.textContent.length === 0 && isLastChild && parent.childCount > minSiblings) {
        const exitNode = createExitNode(state);

        if (exitNode) {
          if (!dispatch) {
            return true;
          }

          const ancestorStart = selection.$from.before(ancestorDepth);
          const ancestorEnd = selection.$from.after(ancestorDepth);
          const interactionEnd = selection.$from.after(ancestorDepth - 1);

          const tr = state.tr.delete(ancestorStart, ancestorEnd);
          const insertPos = tr.mapping.map(interactionEnd);
          tr.insert(insertPos, exitNode);
          // Place the cursor inside the inserted node.
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 1)).scrollIntoView();
          dispatch(tr);
          return true;
        }
      }
    }

    const siblingNode = createSiblingNode(state);
    if (!siblingNode) {
      return false;
    }

    const insertPos = selection.$from.after(ancestorDepth);
    
    if (!dispatch) {
      return true;
    }

    const tr = state.tr.insert(insertPos, siblingNode);
    const newCursorPos = insertPos + selectionOffset;
    tr.setSelection(TextSelection.create(tr.doc, newCursorPos)).scrollIntoView();
    dispatch(tr);
    return true;
  };
}
