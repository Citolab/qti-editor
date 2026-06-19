import { TextSelection } from 'prosemirror-state';

import type { Command, EditorState, Transaction } from 'prosemirror-state';

/**
 * Insert a qti-rubric-block at the end of the current block, containing one
 * empty paragraph. Selection is placed inside that paragraph so the author
 * can start typing immediately.
 */
export function insertRubricBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { schema, tr } = state;
  const rubricType = schema.nodes.qtiRubricBlock;
  const paragraphType = schema.nodes.paragraph;
  if (!rubricType || !paragraphType) return false;

  const { $from } = state.selection;
  if ($from.depth < 1) return false;
  const insertPos = $from.after(1);

  if (dispatch) {
    const node = rubricType.create(undefined, paragraphType.create());
    tr.insert(insertPos, node);
    tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

export const createInsertRubricBlockCommand = (): Command => insertRubricBlock;
