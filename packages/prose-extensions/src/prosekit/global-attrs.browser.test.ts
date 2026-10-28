/**
 * `class`, `id`, `lang` and `xml:lang` on the basic extension's nodes and marks survive parse →
 * serialise, and ids stay unique while editing.
 *
 * Before, ProseMirror's parser read the tag and nothing else, so `<p class="qti-align-center">` came
 * back as a bare `<p>` and every id and language was dropped. Each case below is HTML that must come
 * back exactly as it went in. The plain-ProseMirror half (`withGlobalAttrs`, `createQtiSchema()`) is
 * covered in `html-schema/global-attrs.browser.test.ts` and in prose-qti.
 */
import { createEditor, union, type Extension } from 'prosekit/core'
import { defineHardBreak } from 'prosekit/extensions/hard-break'
import { TextSelection } from 'prosekit/pm/state'
import { DOMParser, DOMSerializer, type Schema } from 'prosemirror-model'
import { describe, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { GLOBAL_ATTRS } from '../prosemirror/html-schema/index.js'
import { defineBasicExtension } from './basic.js'
import { defineNodeGlobalAttrs } from './global-attrs.js'

import type { Node as PmNode } from 'prosekit/pm/model'
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

describe('the global attributes survive the basic extension', () => {
  test.each([
    ['a paragraph', '<p class="qti-align-center" id="p1" lang="en">Centred</p>'],
    ['a heading', '<h2 class="title" id="h" xml:lang="de">Heading</h2>'],
    [
      'a bullet list and its items',
      '<ul class="list" id="ul1"><li class="item" id="li1" lang="fr"><p>a</p></li><li><p>b</p></li></ul>',
    ],
    ['an ordered list', '<ol class="steps" id="ol1" xml:lang="en"><li><p>a</p></li></ol>'],
    ['an image', '<p><img src="a.png" alt="a" class="qti-valign-middle" id="img1" xml:lang="en"></p>'],
    [
      'a table, its rows and its cells',
      '<table class="grid" id="t1"><tbody><tr class="row" id="r1"><th class="head" id="th1"><p>H</p></th></tr>'
        + '<tr><td class="cell" id="td1" lang="nl"><p>C</p></td></tr></tbody></table>',
    ],
    ['strong, em and code', '<p><strong class="s" id="s1">bold</strong> <em lang="la">sic</em> <code class="c">x</code></p>'],
    ['a phrasing mark', '<p>The <abbr class="a" id="a1" xml:lang="en">WHO</abbr>.</p>'],
    ['a span', '<p><span class="qti-underline" id="sp" lang="fr">mot</span></p>'],
  ])('on %s', (_name, html) => {
    expect(roundtrip(html)).toBe(html)
  })

  test('an element without them serialises without them', () => {
    const html = '<p>Plain <strong>bold</strong></p><ul><li><p>a</p></li></ul><p><img src="a.png"></p>'
    expect(roundtrip(html)).toBe(html)
  })

  test('a table without a class still serialises its rows', () => {
    // prosemirror-tables' `['table', ['tbody', 0]]` has no attrs object, and once the table has an
    // attribute ProseKit's wrapper takes `['tbody', 0]` for one. `tableCaptionSpec`'s toDOM writes `{}`.
    const html = '<table><tbody><tr><td><p>C</p></td></tr></tbody></table>'
    expect(roundtrip(html)).toBe(html)
  })

  test('a bare span is unwrapped, keeping its text', () => {
    expect(roundtrip('<p>a <span>b</span> <span class="">c</span></p>')).toBe('<p>a b c</p>')
  })

  test('every node and mark of the base that the list names has all four attributes', () => {
    const names = Object.keys(GLOBAL_ATTRS)
    for (const type of ['paragraph', 'heading', 'bullet_list', 'ordered_list', 'list_item', 'image', 'table', 'tableRow', 'tableCell', 'tableHeaderCell']) {
      expect(Object.keys(basicSchema.nodes[type].spec.attrs ?? {}), type).toEqual(expect.arrayContaining(names))
    }
    for (const type of Object.keys(basicSchema.marks)) {
      expect(Object.keys(basicSchema.marks[type].spec.attrs ?? {}), type).toEqual(expect.arrayContaining(names))
    }
  })

  test('a host adds them to a node of its own with defineNodeGlobalAttrs', () => {
    const schema = schemaOf(union(defineBasicExtension(), defineHardBreak(), defineNodeGlobalAttrs('hardBreak')))
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
    editor,
    view,
    /** Load a document the way a host does (`setContent`), then put the cursor at `pos`. */
    load(html: string, pos: number) {
      const holder = document.createElement('div')
      holder.innerHTML = html
      editor.setContent(DOMParser.fromSchema(view.state.schema).parse(holder))
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)))
      view.focus()
    },
    destroy: () => {
      editor.unmount()
      element.remove()
    },
  }
}

const blocks = (doc: PmNode) => {
  const found: Array<[string, unknown, unknown]> = []
  doc.forEach(node => found.push([node.textContent, node.attrs.class, node.attrs.id]))
  return found
}

describe('ids stay unique while editing', () => {
  test('Enter in the middle of a paragraph keeps the class on both halves and the id on the first', async () => {
    const { view, load, destroy } = mountBasicEditor()
    try {
      load('<p class="qti-align-center" id="p1">ab</p>', 2)
      await userEvent.keyboard('{Enter}')
      expect(blocks(view.state.doc)).toEqual([
        ['a', 'qti-align-center', 'p1'],
        ['b', 'qti-align-center', null],
      ])
    } finally {
      destroy()
    }
  })

  test('Enter at the start of a paragraph leaves the id on the text, not on the empty line', async () => {
    const { view, load, destroy } = mountBasicEditor()
    try {
      load('<p id="p1">ab</p>', 1)
      await userEvent.keyboard('{Enter}')
      expect(blocks(view.state.doc).map(([text, , id]) => [text, id])).toEqual([
        ['', null],
        ['ab', 'p1'],
      ])
    } finally {
      destroy()
    }
  })

  test('Enter at the end opens a paragraph without the id (it is not splittable)', async () => {
    const { view, load, destroy } = mountBasicEditor()
    try {
      load('<p id="p1">ab</p>', 3)
      await userEvent.keyboard('{Enter}')
      expect(blocks(view.state.doc).map(([text, , id]) => [text, id])).toEqual([
        ['ab', 'p1'],
        ['', null],
      ])
    } finally {
      destroy()
    }
  })

  test('copying a block and pasting it elsewhere clears the id on the pasted copy', async () => {
    const { view, load, destroy } = mountBasicEditor()
    try {
      load('<p>one</p><p id="p2" class="k">two</p><p>three</p><p>end</p>', 2)
      // From inside "one" to inside "three": "two" is copied whole, with its attributes.
      const { doc } = view.state
      const insideThree = doc.child(0).nodeSize + doc.child(1).nodeSize + 3
      view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 2, insideThree)))
      await userEvent.copy()
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, view.state.doc.content.size - 1)))
      await userEvent.paste()

      const twos = blocks(view.state.doc).filter(([text]) => text === 'two')
      expect(twos).toEqual([
        ['two', 'k', 'p2'],
        ['two', 'k', null],
      ])
    } finally {
      destroy()
    }
  })

  test('a loaded document with duplicate ids keeps them, also after an edit elsewhere', async () => {
    const { view, load, destroy } = mountBasicEditor()
    try {
      load('<p id="dup">a</p><p id="dup">b</p><p>c</p>', 8)
      await userEvent.keyboard('xyz')
      expect(blocks(view.state.doc).map(([text, , id]) => [text, id])).toEqual([
        ['a', 'dup'],
        ['b', 'dup'],
        ['cxyz', null],
      ])
    } finally {
      destroy()
    }
  })
})
