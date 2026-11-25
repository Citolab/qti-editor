import { definePlugin, type PlainExtension } from 'prosekit/core'
import { insertTable, type InsertTableOptions } from 'prosekit/extensions/table'
import { Plugin, PluginKey } from 'prosekit/pm/state'

import type { Node as PmNode } from 'prosekit/pm/model'
import type { Command, EditorState, Transaction } from 'prosekit/pm/state'

/**
 * Table lines, the QTI way: `qti-bordered` (QTI 3 shared vocabulary).
 *
 * A player draws lines only on the elements that carry the class, so "a table with lines" means the
 * class on the table AND on every cell. These commands set it that way, and `defineTableBorders()`
 * keeps it that way: prosemirror-tables makes the cells of a new row or column without it, so the
 * plugin gives them their table's lines. Needs the `class` attribute from table-classes.ts.
 */
export const BORDERED = 'qti-bordered'

const isCell = (node: PmNode) => node.type.spec.tableRole === 'cell' || node.type.spec.tableRole === 'header_cell'
const classesOf = (node: PmNode) => String((node.attrs.class as string | null) ?? '').split(/\s+/).filter(Boolean)

/** Whether a table or cell carries `qti-bordered`. */
export const isBordered = (node: PmNode): boolean => classesOf(node).includes(BORDERED)

/** `class` with `qti-bordered` added or taken out; other classes are kept, null when none is left. */
function withBorder(node: PmNode, on: boolean): string | null {
  const rest = classesOf(node).filter((c) => c !== BORDERED)
  const next = on ? [...rest, BORDERED] : rest
  return next.length ? next.join(' ') : null
}

/** The innermost table the selection is in, or null. */
export function tableAt(state: EditorState): { pos: number; node: PmNode } | null {
  const $from = state.selection.$from
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.spec.tableRole === 'table') return { pos: $from.before(d), node: $from.node(d) }
  }
  return null
}

/** Lines on the table at `pos` and on each of its own cells (not on a table nested in a cell). */
function setBorders(tr: Transaction, pos: number, table: PmNode, on: boolean): Transaction {
  if (isBordered(table) !== on) tr.setNodeAttribute(pos, 'class', withBorder(table, on))
  table.forEach((row, rowOffset) => {
    row.forEach((cell, cellOffset) => {
      if (isCell(cell) && isBordered(cell) !== on) {
        tr.setNodeAttribute(pos + 1 + rowOffset + 1 + cellOffset, 'class', withBorder(cell, on))
      }
    })
  })
  return tr
}

/** Lines on (`on`) or off for the table the selection is in. False outside a table. */
export function setTableBorders(on: boolean): Command {
  return (state, dispatch) => {
    const table = tableAt(state)
    if (!table) return false
    if (dispatch) dispatch(setBorders(state.tr, table.pos, table.node, on))
    return true
  }
}

/** Switches the lines of the table the selection is in. False outside a table. */
export const toggleTableBorders: Command = (state, dispatch, view) => {
  const table = tableAt(state)
  return table ? setTableBorders(!isBordered(table.node))(state, dispatch, view) : false
}

/** ProseKit's `insertTable`, then lines on the new table: for hosts that want tables bordered by default. */
export function insertBorderedTable(options: InsertTableOptions): Command {
  return (state, dispatch, view) => {
    if (!dispatch) return insertTable(options)(state, undefined, view)
    let inserted: Transaction | null = null
    if (!insertTable(options)(state, (tr) => (inserted = tr), view) || !inserted) return false
    const tr = inserted as Transaction
    const table = tableAt(state.apply(tr))
    dispatch(table ? setBorders(tr, table.pos, table.node, true) : tr)
    return true
  }
}

/** Cells of a bordered table that lack the class (a row or column added since) get their table's lines. */
function syncCells(state: EditorState): Transaction | null {
  let tr: Transaction | null = null
  state.doc.descendants((node, pos) => {
    if (node.type.spec.tableRole !== 'table') return true
    if (isBordered(node)) {
      let missing = false
      node.forEach((row) => row.forEach((cell) => (missing ||= isCell(cell) && !isBordered(cell))))
      if (missing) tr = setBorders(tr ?? state.tr, pos, node, true)
    }
    return true
  })
  return tr
}

const key = new PluginKey('tableBorders')

/** The plugin behind `defineTableBorders()`, for hosts that build their own plugin list. */
export const tableBordersPlugin = (): Plugin =>
  new Plugin({ key, appendTransaction: (trs, _old, state) => (trs.some((tr) => tr.docChanged) ? syncCells(state) : null) })

/** Keeps every cell of a bordered table bordered after each change. */
export function defineTableBorders(): PlainExtension {
  return definePlugin(tableBordersPlugin()) as PlainExtension
}
