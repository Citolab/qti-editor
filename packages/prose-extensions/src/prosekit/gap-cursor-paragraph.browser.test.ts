/**
 * Typing at a gap cursor.
 *
 * `defineGapCursor()` decides WHERE the collapsed space between two blocks is reachable;
 * `defineGapCursorParagraph()` decides WHAT typing there produces. The second half is the one that
 * silently goes wrong, because ProseMirror's default answer depends on the order node types were
 * registered in the schema — an implementation detail of how extensions were unioned, not a
 * decision anyone made.
 *
 * These tests cover the plugin's own behaviour against this package's basic schema, where the
 * default happens to be RIGHT already: `defineQtiDoc` writes `content: '(paragraph | block)+'`, and
 * naming paragraph first is what makes it win the tie. That is exactly how vanilla ProseMirror gets
 * paragraphs out of a gap cursor — by luck of ordering rather than by decision.
 *
 * The failure the plugin exists for needs a schema that has lost that luck, which is any host that
 * rewrites the doc content expression. The prosekit app does (`heading paragraph qtiItemDivider
 * block*`, for its locked header), and its own test asserts both halves there: that the default
 * would pick `heading`, and that the plugin overrides it. Keep that assertion with that schema — put
 * here, against a doc that names paragraph first, it would assert the opposite and fail.
 */
import { createEditor } from 'prosekit/core'
import { GapCursor } from 'prosemirror-gapcursor'
import { describe, expect, test } from 'vitest'

import { defineBasicExtension } from './basic.js'

import type { Node as PmNode } from 'prosemirror-model'

function makeEditor() {
  const editor = createEditor({ extension: defineBasicExtension() })
  const element = document.createElement('div')
  document.body.appendChild(element)
  editor.mount(element)
  return {
    editor,
    element,
    destroy: () => {
      ;(editor as unknown as { view?: { destroy(): void } }).view?.destroy()
      element.remove()
    },
  }
}

/** Two tables back to back: both are blocks holding no inline content, so a gap sits between them. */
function docWithTwoClosedBlocks(schema: PmNode['type']['schema']): PmNode {
  const cell = schema.nodes.tableCell.createAndFill()!
  const row = schema.nodes.tableRow.createChecked(null, [cell])
  const table = () => schema.nodes.table.createChecked(null, [row])
  return schema.nodes.doc.createChecked(null, [table(), table()])
}

describe('typing at a gap cursor', () => {
  test('inserts a paragraph holding the typed text', () => {
    const { editor, destroy } = makeEditor()
    try {
      const view = (editor as unknown as { view: any }).view
      const schema = editor.schema
      const doc = docWithTwoClosedBlocks(schema)
      const gapPos = doc.child(0).nodeSize

      let state = view.state
      state = state.apply(state.tr.replaceWith(0, state.doc.content.size, doc.content))
      state = state.apply(state.tr.setSelection(new GapCursor(state.doc.resolve(gapPos))))
      view.updateState(state)

      const handled = view.someProp('handleTextInput', (f: any) =>
        f(view, gapPos, gapPos, 'between'),
      )

      expect(handled).toBe(true)
      const inserted = view.state.doc.child(1)
      expect(inserted.type.name).toBe('paragraph')
      expect(inserted.textContent).toBe('between')
      // The tables either side are untouched — the paragraph went between them, not into one.
      expect(view.state.doc.child(0).type.name).toBe('table')
      expect(view.state.doc.child(2).type.name).toBe('table')
    } finally {
      destroy()
    }
  })

  test('leaves a normal text selection alone', () => {
    const { editor, destroy } = makeEditor()
    try {
      const view = (editor as unknown as { view: any }).view
      // Default state is a paragraph with a text selection in it; the plugin must not claim this,
      // or every keystroke in the document would open a new paragraph.
      const handled = view.someProp('handleTextInput', (f: any) => f(view, 1, 1, 'x'))

      expect(handled).toBeFalsy()
    } finally {
      destroy()
    }
  })
})
