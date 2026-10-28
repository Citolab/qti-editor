/**
 * `class` and `id` on the basic extension's body nodes and marks survive parse → serialise.
 *
 * Before, ProseMirror's parser read the tag and nothing else, so `<p class="qti-align-center">` came
 * back as a bare `<p>` and every id was dropped. Each case below is HTML that must come back exactly
 * as it went in.
 */
import { createEditor, union, type Extension } from 'prosekit/core'
import { defineHardBreak } from 'prosekit/extensions/hard-break'
import { TextSelection } from 'prosekit/pm/state'
import { DOMParser, DOMSerializer, type Schema } from 'prosemirror-model'
import { describe, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { defineBasicExtension } from './basic.js'
import { defineNodeClassAndId } from './class-and-id.js'

import type { EditorView } from 'prosekit/pm/view'

const schemaOf = (extension: Extension): Schema => createEditor({ extension }).schema

const basicSchema = schemaOf(defineBasicExtension())

function roundtrip(html: string, schema: Schema = basicSchema): string {
  const holder = document.createElement('div')
  holder.innerHTML = html
  const doc = DOMParser.fromSchema(schema).parse(holder)
  const out = document.createElement('div')
  out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content))
  return out.innerHTML
}

describe('class and id survive the basic extension', () => {
  test.each([
    ['a paragraph', '<p class="qti-align-center" id="p1">Centred</p>'],
    ['a heading', '<h2 class="title" id="h">Heading</h2>'],
    [
      'a bullet list and its items',
      '<ul class="list" id="ul1"><li class="item" id="li1"><p>a</p></li><li><p>b</p></li></ul>',
    ],
    ['an ordered list', '<ol class="steps" id="ol1"><li><p>a</p></li></ol>'],
    ['an image', '<p><img src="a.png" alt="a" class="qti-valign-middle" id="img1"></p>'],
    [
      'a table, its rows and its cells',
      '<table class="grid" id="t1"><tbody><tr class="row" id="r1"><th class="head" id="th1"><p>H</p></th></tr>'
        + '<tr><td class="cell" id="td1"><p>C</p></td></tr></tbody></table>',
    ],
    [
      'strong and em',
      '<p><strong class="s" id="s1">bold</strong> and <em class="e" id="e1">italic</em></p>',
    ],
  ])('on %s', (_name, html) => {
    expect(roundtrip(html)).toBe(html)
  })

  test('an element without them serialises without them', () => {
    const html = '<p>Plain <strong>bold</strong></p><ul><li><p>a</p></li></ul><p><img src="a.png"></p>'
    expect(roundtrip(html)).toBe(html)
  })

  test('a table without a class still serialises its rows', () => {
    // prosemirror-tables' `['table', ['tbody', 0]]` has no attrs object, and once the table has an
    // attribute ProseKit's wrapper takes `['tbody', 0]` for one. basic.ts gives it an explicit `{}`.
    const html = '<table><tbody><tr><td><p>C</p></td></tr></tbody></table>'
    expect(roundtrip(html)).toBe(html)
  })

  test('a host adds them to a node of its own with defineNodeClassAndId', () => {
    const schema = schemaOf(union(defineBasicExtension(), defineHardBreak(), defineNodeClassAndId('hardBreak')))
    const html = '<p>a<br class="b" id="br1">b</p>'
    expect(roundtrip(html, schema)).toBe(html)
  })
})

function mountBasicEditor() {
  const editor = createEditor({ extension: defineBasicExtension() })
  const element = document.createElement('div')
  document.body.appendChild(element)
  editor.mount(element)
  const view = (editor as unknown as { view: EditorView }).view
  return {
    view,
    destroy: () => {
      view.destroy()
      element.remove()
    },
  }
}

describe('ids stay unique while editing', () => {
  test('Enter in the middle of a paragraph keeps the class on both halves and the id on the first', async () => {
    const { view, destroy } = mountBasicEditor()
    try {
      const { schema } = view.state
      const paragraph = schema.nodes.paragraph.create({ class: 'qti-align-center', id: 'p1' }, schema.text('ab'))
      let state = view.state.apply(view.state.tr.replaceWith(0, view.state.doc.content.size, paragraph))
      // Between "a" and "b": a split there copies every attribute, `splittable` or not.
      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)))
      view.updateState(state)
      view.focus()

      await userEvent.keyboard('{Enter}')

      const halves = [view.state.doc.child(0), view.state.doc.child(1)]
      expect(halves.map(node => node.textContent)).toEqual(['a', 'b'])
      expect(halves.map(node => node.attrs.class)).toEqual(['qti-align-center', 'qti-align-center'])
      expect(halves.map(node => node.attrs.id)).toEqual(['p1', null])
    } finally {
      destroy()
    }
  })

  test('a copy inserted before the original loses the id, and the original keeps it', () => {
    const { view, destroy } = mountBasicEditor()
    try {
      const { schema } = view.state
      const original = schema.nodes.paragraph.create({ id: 'p1' }, schema.text('original'))
      view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, original))

      const copy = schema.nodes.paragraph.create({ id: 'p1' }, schema.text('copy'))
      view.dispatch(view.state.tr.insert(0, copy))

      const ids = [view.state.doc.child(0), view.state.doc.child(1)].map(node => [node.textContent, node.attrs.id])
      expect(ids).toEqual([['copy', null], ['original', 'p1']])
    } finally {
      destroy()
    }
  })
})
