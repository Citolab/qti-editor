import { TextSelection } from 'prosemirror-state';

import type { Command, EditorState, Transaction } from 'prosemirror-state';

/**
 * Command to insert a QTI item divider at the current position.
 * 
 * This command will:
 * 1. Insert a divider block at the cursor position
 * 2. Add a new paragraph after it so the user can continue editing
 */
export function insertItemDivider(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { schema, tr } = state;
  const dividerType = schema.nodes.qtiItemDivider;
  
  if (!dividerType) {
    return false;
  }

  const { $from } = state.selection;
  
  // Find the position where we should insert the divider
  // We want to insert it at the end of the current block
  const insertPos = $from.after();

  if (dispatch) {
    // Insert the divider node
    const divider = dividerType.create();
    
    // Create a new paragraph after the divider to allow continued editing
    const paragraph = schema.nodes.paragraph?.create();
    
    // Insert both nodes
    if (paragraph) {
      tr.insert(insertPos, [divider, paragraph]);
      // Move cursor to the new paragraph
      tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
    } else {
      tr.insert(insertPos, divider);
    }
    
    dispatch(tr.scrollIntoView());
  }

  return true;
}

/**
 * Typed version of the insert command for better IDE support
 */
export const createInsertItemDividerCommand = (): Command => insertItemDivider;
