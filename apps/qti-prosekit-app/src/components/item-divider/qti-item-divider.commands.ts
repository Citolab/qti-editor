import { TextSelection } from 'prosemirror-state';

import type { Command, EditorState, Transaction } from 'prosemirror-state';

/**
 * Insert a qti-item-divider followed by an empty paragraph, placing the
 * cursor in the new paragraph so authoring can continue immediately.
 */
export const insertItemDivider: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { schema, tr } = state;
  const dividerType = schema.nodes.qtiItemDivider;
  if (!dividerType) return false;

  const { $from } = state.selection;
  const insertPos = $from.after();

  if (dispatch) {
    const divider = dividerType.create();
    const paragraph = schema.nodes.paragraph?.create();

    if (paragraph) {
      tr.insert(insertPos, [divider, paragraph]);
      tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
    } else {
      tr.insert(insertPos, divider);
    }

    dispatch(tr.scrollIntoView());
  }

  return true;
};
