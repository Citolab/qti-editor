import { defineKeymap, Priority, withPriority, type PlainExtension } from 'prosekit/core'
import { isCellSelection } from 'prosekit/extensions/table'

import type { Command } from 'prosekit/pm/state'

/**
 * Backspace / Delete on a cell selection that covers the whole table deletes the table.
 *
 * prosemirror-tables only clears the selected cells, so a fully selected table could be emptied but
 * never removed: the author was left with an empty grid and no key that takes it away. A smaller
 * selection still falls through to prosemirror-tables and clears its cells.
 */
export const deleteSelectedTable: Command = (state, dispatch) => {
  const selection = state.selection
  if (!isCellSelection(selection) || !selection.isRowSelection() || !selection.isColSelection()) {
    return false
  }
  const $cell = selection.$anchorCell
  for (let depth = $cell.depth; depth > 0; depth--) {
    if ($cell.node(depth).type.spec.tableRole !== 'table') continue
    dispatch?.(state.tr.delete($cell.before(depth), $cell.after(depth)).scrollIntoView())
    return true
  }
  return false
}

/** Ahead of the table plugin's own Backspace / Delete, which would clear the cells first. */
export function defineTableDeletion(): PlainExtension {
  return withPriority(
    defineKeymap({ Backspace: deleteSelectedTable, Delete: deleteSelectedTable }),
    Priority.high,
  )
}
