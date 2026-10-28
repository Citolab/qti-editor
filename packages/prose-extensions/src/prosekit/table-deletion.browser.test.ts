/**
 * Backspace / Delete on a table selected as a whole removes the table; on part of it, only clears the
 * selected cells. The selection is made the way an author makes it — a click in one cell and a
 * Shift+click in another, which prosemirror-tables turns into a CellSelection.
 */
import { createEditor } from 'prosekit/core'
import { isCellSelection } from 'prosekit/extensions/table'
import { describe, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { defineBasicExtension } from './basic.js'

import type { Node as PmNode, Schema } from 'prosemirror-model'
import type { EditorView } from 'prosemirror-view'

function makeEditor() {
  const editor = createEditor({ extension: defineBasicExtension() })
  const element = document.createElement('div')
  document.body.appendChild(element)
  editor.mount(element)
  const view = (editor as unknown as { view: EditorView }).view
  return {
    view,
    element,
    destroy: () => {
      view.destroy()
      element.remove()
    },
  }
}

/** A 2×2 table of named cells with a paragraph after it. */
function tableDoc(schema: Schema): PmNode {
  const cell = (text: string) =>
    schema.nodes.tableCell.createChecked(null, schema.nodes.paragraph.createChecked(null, schema.text(text)))
  const row = (...texts: string[]) => schema.nodes.tableRow.createChecked(null, texts.map(cell))
  const table = schema.nodes.table.createChecked(null, [row('A1', 'A2'), row('B1', 'B2')])
  const after = schema.nodes.paragraph.createChecked(null, schema.text('after'))
  return schema.nodes.doc.createChecked(null, [table, after])
}

async function selectCells(element: HTMLElement, from: number, to: number) {
  const cells = element.querySelectorAll('td')
  await userEvent.click(cells[from]!)
  await userEvent.click(cells[to]!, { modifiers: ['Shift'] })
}

describe('deleting a fully selected table', () => {
  test.each(['{Backspace}', '{Delete}'])('%s removes the whole table', async (key) => {
    const { view, element, destroy } = makeEditor()
    try {
      const doc = tableDoc(view.state.schema)
      view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content))

      await selectCells(element, 0, 3)
      expect(isCellSelection(view.state.selection)).toBe(true)

      await userEvent.keyboard(key)

      expect(view.state.doc.childCount).toBe(1)
      expect(view.state.doc.child(0).type.name).toBe('paragraph')
      expect(view.state.doc.textContent).toBe('after')
    } finally {
      destroy()
    }
  })

  test('a partial selection only clears the selected cells', async () => {
    const { view, element, destroy } = makeEditor()
    try {
      const doc = tableDoc(view.state.schema)
      view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content))

      // The first row only.
      await selectCells(element, 0, 1)
      expect(isCellSelection(view.state.selection)).toBe(true)

      await userEvent.keyboard('{Backspace}')

      const table = view.state.doc.child(0)
      expect(table.type.name).toBe('table')
      expect(table.textContent).toBe('B1B2')
    } finally {
      destroy()
    }
  })
})
