/**
 * Table classes and lines (`qti-bordered`): a class on a table, row or cell survives load → save, and
 * the borders commands put the class on the table and every cell, keep it on rows and columns added
 * later, and take it off again. The cursor is placed with a real click, as an author does.
 */
import { createEditor } from 'prosekit/core'
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model'
import { describe, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { defineBasicExtension } from './basic.js'
import { insertBorderedTable, isBordered, setTableBorders, tableAt, toggleTableBorders } from './table-borders.js'

import type { Node as PmNode } from 'prosemirror-model'
import type { Command } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

function makeEditor(html: string) {
  const editor = createEditor({ extension: defineBasicExtension() })
  const element = document.createElement('div')
  document.body.appendChild(element)
  editor.mount(element)
  const view = (editor as unknown as { view: EditorView }).view
  const source = document.createElement('div')
  source.innerHTML = html
  const doc = PmDOMParser.fromSchema(view.state.schema).parse(source)
  view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content))
  return {
    editor,
    view,
    element,
    run: (command: Command) => command(view.state, view.dispatch, view),
    /** The document as the editor writes it. */
    html: () => {
      const out = document.createElement('div')
      out.appendChild(DOMSerializer.fromSchema(view.state.schema).serializeFragment(view.state.doc.content))
      return out.innerHTML
    },
    destroy: () => {
      view.destroy()
      element.remove()
    },
  }
}

const TABLE =
  '<table class="data"><tbody><tr class="head"><th>Group</th><th>Index</th></tr>' +
  '<tr><td class="x">Food</td><td>140</td></tr></tbody></table><p>after</p>'

/** The first table's own cells. */
function cellsOf(view: EditorView): PmNode[] {
  const cells: PmNode[] = []
  tableAt(view.state)!.node.descendants((n) => {
    if (n.type.spec.tableRole === 'cell' || n.type.spec.tableRole === 'header_cell') cells.push(n)
    return true
  })
  return cells
}

/** Puts the cursor in the table with a real click (a data cell: the commands act on the whole table). */
async function clickIntoFirstCell(element: HTMLElement) {
  await userEvent.click(element.querySelector('td')!)
}

describe('table classes', () => {
  test('a class on a table, row or cell survives load → save', () => {
    const { html, destroy } = makeEditor(TABLE)
    try {
      const out = html()
      expect(out).toContain('<table class="data">')
      expect(out).toContain('<tr class="head">')
      expect(out).toContain('<td class="x">')
    } finally {
      destroy()
    }
  })
})

describe('table borders (qti-bordered)', () => {
  test('on puts the class on the table and every cell, keeps other classes; off takes it away again', async () => {
    const { view, element, run, html, destroy } = makeEditor(TABLE)
    try {
      await clickIntoFirstCell(element)
      expect(run(setTableBorders(true))).toBe(true)
      expect([tableAt(view.state)!.node, ...cellsOf(view)].every(isBordered)).toBe(true)
      expect(html()).toContain('<table class="data qti-bordered">')
      expect(html()).toContain('<td class="x qti-bordered">')

      expect(run(toggleTableBorders)).toBe(true)
      expect(tableAt(view.state)!.node.attrs.class).toBe('data')
      expect(cellsOf(view).map((c) => c.attrs.class)).toEqual([null, null, 'x', null])
    } finally {
      destroy()
    }
  })

  test('a row or column added to a bordered table gets its lines; a table without lines stays without', async () => {
    const { editor, view, element, run, destroy } = makeEditor(TABLE)
    try {
      await clickIntoFirstCell(element)
      const commands = editor.commands as unknown as Record<string, () => boolean>
      commands.addTableRowBelow!()
      expect(cellsOf(view).some(isBordered)).toBe(false)

      run(setTableBorders(true))
      commands.addTableRowBelow!()
      commands.addTableColumnAfter!()
      expect(cellsOf(view)).toHaveLength(12)
      expect(cellsOf(view).every(isBordered)).toBe(true)
    } finally {
      destroy()
    }
  })

  test('insertBorderedTable inserts a table with lines; the commands do nothing outside a table', async () => {
    const { view, element, run, destroy } = makeEditor('<p>before</p>')
    try {
      await userEvent.click(element.querySelector('p')!)
      expect(run(setTableBorders(true))).toBe(false)
      expect(run(toggleTableBorders)).toBe(false)

      expect(run(insertBorderedTable({ row: 2, col: 3 }))).toBe(true)
      expect(tableAt(view.state)).not.toBeNull()
      expect(cellsOf(view)).toHaveLength(6)
      expect([tableAt(view.state)!.node, ...cellsOf(view)].every(isBordered)).toBe(true)
    } finally {
      destroy()
    }
  })
})
