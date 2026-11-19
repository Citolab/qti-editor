/**
 * `alt=""` marks an image as decorative, and QTI 3.0 makes `alt` required on `img` — so the image
 * parse rule must not read `""` as "no alt". An absent `alt` must stay absent, though: inventing
 * `alt=""` would claim the image is decorative, which only the author can decide.
 */
import { createEditor } from 'prosekit/core'
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model'
import { describe, expect, test } from 'vitest'

import { defineBasicExtension } from './basic.js'

import type { Node as PmNode } from 'prosemirror-model'

const schema = createEditor({ extension: defineBasicExtension() }).schema

function parse(html: string): PmNode {
  const host = document.createElement('div')
  host.innerHTML = html
  return PmDOMParser.fromSchema(schema).parse(host)
}

function firstImage(doc: PmNode): PmNode {
  let found: PmNode | null = null
  doc.descendants((node) => {
    if (!found && node.type === schema.nodes.image) found = node
  })
  if (!found) throw new Error('no image in the parsed document')
  return found
}

/** Parse, serialise, and return the `alt` of the `<img>` that comes out (`null` when absent). */
function roundtripAlt(html: string): string | null {
  const host = document.createElement('div')
  host.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(parse(html).content))
  const image = host.querySelector('img')
  if (!image) throw new Error(`no <img> in the serialised output: ${host.innerHTML}`)
  return image.getAttribute('alt')
}

describe('the image alt attribute', () => {
  test('alt="" is parsed as an empty string, not as null', () => {
    expect(firstImage(parse('<p><img src="a.png" alt=""></p>')).attrs.alt).toBe('')
  })

  test('alt="" survives a parse/serialise round trip', () => {
    expect(roundtripAlt('<p><img src="a.png" alt=""></p>')).toBe('')
  })

  test('alt text survives unchanged', () => {
    expect(roundtripAlt('<p><img src="a.png" alt="A red square"></p>')).toBe('A red square')
  })

  test('an image without alt is not given one', () => {
    expect(firstImage(parse('<p><img src="a.png"></p>')).attrs.alt).toBeNull()
    expect(roundtripAlt('<p><img src="a.png"></p>')).toBeNull()
  })
})
