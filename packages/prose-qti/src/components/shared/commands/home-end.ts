import { TextSelection } from 'prosemirror-state';

import type { Command } from 'prosemirror-state';

function insideIsolatingAncestor(selection: { $head: { depth: number; node: (d: number) => { type: { spec: { isolating?: boolean } } } } }): boolean {
  const { $head } = selection;
  for (let d = $head.depth - 1; d >= 0; d -= 1) {
    if ($head.node(d).type.spec.isolating) return true;
  }
  return false;
}

/**
 * Home: move cursor to start of the current textblock.
 *
 * Only fires when the cursor is inside an isolating ancestor — shadow-DOM
 * custom elements confuse the browser's native Home handling, so we override
 * it explicitly. Outside isolating nodes the browser's default is fine.
 */
export const constrainedHome: Command = (state, dispatch) => {
  const { $head } = state.selection;
  if (!$head.parent.isTextblock || !insideIsolatingAncestor(state.selection)) return false;

  const start = $head.start($head.depth);
  if (dispatch) {
    dispatch(state.tr.setSelection(TextSelection.create(state.doc, start)).scrollIntoView());
  }
  return true;
};

/**
 * Shift+Home: extend selection to start of the current textblock.
 */
export const constrainedShiftHome: Command = (state, dispatch) => {
  const sel = state.selection;
  const { $head } = sel;
  if (!$head.parent.isTextblock || !insideIsolatingAncestor(sel)) return false;

  const start = $head.start($head.depth);
  if (dispatch) {
    const anchor = sel instanceof TextSelection ? sel.$anchor.pos : sel.from;
    dispatch(state.tr.setSelection(TextSelection.create(state.doc, anchor, start)).scrollIntoView());
  }
  return true;
};

/**
 * End: move cursor to end of the current textblock.
 */
export const constrainedEnd: Command = (state, dispatch) => {
  const { $head } = state.selection;
  if (!$head.parent.isTextblock || !insideIsolatingAncestor(state.selection)) return false;

  const end = $head.end($head.depth);
  if (dispatch) {
    dispatch(state.tr.setSelection(TextSelection.create(state.doc, end)).scrollIntoView());
  }
  return true;
};

/**
 * Shift+End: extend selection to end of the current textblock.
 */
export const constrainedShiftEnd: Command = (state, dispatch) => {
  const sel = state.selection;
  const { $head } = sel;
  if (!$head.parent.isTextblock || !insideIsolatingAncestor(sel)) return false;

  const end = $head.end($head.depth);
  if (dispatch) {
    const anchor = sel instanceof TextSelection ? sel.$anchor.pos : sel.from;
    dispatch(state.tr.setSelection(TextSelection.create(state.doc, anchor, end)).scrollIntoView());
  }
  return true;
};
