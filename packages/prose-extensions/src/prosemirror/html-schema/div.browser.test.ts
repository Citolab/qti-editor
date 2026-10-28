/**
 * `<div>` through parse → serialise, in both schema paths built from this package: a div of blocks
 * with a class, id or language is kept, and a div of inline content is a paragraph written as a div.
 * Each case is HTML that must come back exactly as it went in. prose-qti runs whole items, with QTI's
 * inline elements, through both of its schemas.
 */
import { createEditor } from 'prosekit/core'
import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model'
import { nodes as basicNodes, marks as basicMarks } from 'prosemirror-schema-basic'
import { bulletList, listItem, orderedList } from 'prosemirror-schema-list'
import { describe, expect, test } from 'vitest'

import { defineBasicExtension } from '../../prosekit/basic.js'
import { divNodeSpec, isInlineContentDiv, withDivParagraph, withGlobalAttrsOn } from './index.js'

const SCHEMAS: ReadonlyArray<readonly [string, Schema]> = [
  ['defineBasicExtension()', createEditor({ extension: defineBasicExtension() }).schema],
  [
    'a plain schema',
    new Schema({
      nodes: withGlobalAttrsOn({
        ...basicNodes,
        paragraph: withDivParagraph({ ...basicNodes.paragraph, group: 'block richtext' }),
        div: divNodeSpec,
        bullet_list: { ...bulletList, content: 'list_item+', group: 'block' },
        ordered_list: { ...orderedList, content: 'list_item+', group: 'block' },
        list_item: { ...listItem, content: 'paragraph block*' },
      }),
      marks: withGlobalAttrsOn({ ...basicMarks }),
    }),
  ],
]

const element = (html: string): Element => {
  const holder = document.createElement('div')
  holder.innerHTML = html
  return holder.firstElementChild!
}

describe.each(SCHEMAS)('in %s', (_label, schema) => {
  function roundtrip(html: string): string {
    const holder = document.createElement('div')
    holder.innerHTML = html
    const doc = DOMParser.fromSchema(schema).parse(holder)
    const out = document.createElement('div')
    out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content))
    return out.innerHTML
  }

  describe('a div of blocks with a class, id or language', () => {
    test.each([
      ['a class', '<div class="kader"><p>a</p><p>b</p></div>'],
      ['an id', '<div id="k1"><p>a</p></div>'],
      ['a language', '<div lang="fr"><p>a</p></div>'],
      ['nested divs', '<div class="a"><div class="b"><p>x</p></div></div>'],
      ['a list inside', '<div class="kader"><ul><li><p>a</p></li></ul></div>'],
    ])('keeps %s', (_name, html) => {
      expect(roundtrip(html)).toBe(html)
    })

    test('a bare div of blocks is still unwrapped', () => {
      expect(roundtrip('<div><p>a</p><p>b</p></div>')).toBe('<p>a</p><p>b</p>')
    })
  })

  describe('a div of inline content is a paragraph written as a div', () => {
    test.each([
      ['bare', '<div>text</div>'],
      ['with a class', '<div class="kader">text <strong>bold</strong></div>'],
      ['as the children of a styled div', '<div class="flex"><div>left</div><div>right</div></div>'],
      ['holding only an image', '<div><img src="a.png" alt="a"></div>'],
    ])('%s', (_name, html) => {
      expect(roundtrip(html)).toBe(html)
    })

    test('a p stays a p', () => {
      expect(roundtrip('<p>text</p><div>div</div>')).toBe('<p>text</p><div>div</div>')
    })
  })

  describe('the div is never the filler for empty content', () => {
    // It is in `block` and holds blocks. Its `class` attr is required, so ProseMirror never picks it
    // to fill an empty `block+`; that stays `paragraph`.
    test.each(['doc', 'div', 'list_item'])('%s fills with a paragraph', type => {
      expect(schema.nodes[type].contentMatch.defaultType?.name).toBe('paragraph')
    })
  })
})

test('ProseKit table cells fill with a paragraph too', () => {
  const [[, prosekit]] = SCHEMAS
  for (const type of ['tableCell', 'tableHeaderCell']) {
    expect(prosekit.nodes[type].contentMatch.defaultType?.name, type).toBe('paragraph')
  }
})

describe('isInlineContentDiv', () => {
  test.each([
    ['text', '<div>text</div>', true],
    ['inline markup', '<div>a <em>b</em> <span>c</span><br>d</div>', true],
    ['MathML', '<div>x = <math><mi>y</mi></math></div>', true],
    ['a paragraph', '<div><p>a</p></div>', false],
    ['a list', '<div><ul><li>a</li></ul></div>', false],
    ['an unknown custom element', '<div>Fill in: <x-input></x-input></div>', false],
    ['not a div at all', '<section>text</section>', false],
  ])('%s → %s', (_name, html, expected) => {
    expect(isInlineContentDiv(element(html))).toBe(expected)
  })

  test('a custom element the caller names as inline keeps the div a paragraph', () => {
    expect(isInlineContentDiv(element('<div>Fill in: <x-input></x-input></div>'), { inlineElements: ['x-input'] })).toBe(true)
  })
})
