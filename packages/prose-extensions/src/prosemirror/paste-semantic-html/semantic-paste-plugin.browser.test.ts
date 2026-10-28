/**
 * Pasting from Word, with a focus on what the clipboard's IMAGE files are allowed to become.
 *
 * Word (and Excel, PowerPoint, Outlook) put two things on the clipboard: the `text/html` that is the
 * real content, and a single PNG that is a rendering of the whole selection — a fallback for targets
 * that cannot read HTML. The plugin used to treat that PNG as image content, which is how a paste of
 * plain Word text grew a picture of itself, and how the first real figure in a mixed paste got
 * overwritten by a screenshot of everything around it.
 *
 * The rule these tests pin down: the clipboard images are only content when they cannot be that
 * fallback — a paste with no usable HTML, or HTML that is images and nothing else whose unloadable
 * placeholders match the clipboard images one for one.
 */
import { createEditor, union } from 'prosekit/core'
import { Slice } from 'prosemirror-model'
import { describe, expect, test } from 'vitest'

import { defineBasicExtension } from '../../prosekit/basic.js'
import { defineSemanticPasteExtension } from './extension.js'
import { createSemanticPastePlugin, type SemanticPasteOptions } from './semantic-paste-plugin.js'

import type { Node as PmNode } from 'prosemirror-model'
import type { EditorView } from 'prosemirror-view'

/** A 1x1 PNG. Stands in for whatever bitmap the source application rendered. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`

function pngFile(name = 'image.png'): File {
  const binary = atob(PNG_BASE64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], name, { type: 'image/png' })
}

function makeEditor(options?: SemanticPasteOptions) {
  const editor = createEditor({
    extension: union(defineBasicExtension(), defineSemanticPasteExtension(options)),
  })
  const element = document.createElement('div')
  document.body.appendChild(element)
  editor.mount(element)

  return {
    view: (editor as unknown as { view: EditorView }).view,
    destroy: () => {
      ;(editor as unknown as { view?: { destroy(): void } }).view?.destroy()
      element.remove()
    },
  }
}

async function paste(view: EditorView, { html, text, files }: { html?: string; text?: string; files?: File[] }) {
  const data = new DataTransfer()
  if (html) data.setData('text/html', html)
  if (text) data.setData('text/plain', text)
  for (const file of files ?? []) data.items.add(file)

  view.dom.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  // The image branches read files through FileReader, so the document settles a microtask-plus later.
  await new Promise((resolve) => setTimeout(resolve, 100))
}

/** Every image node in the document, in order. */
function images(doc: PmNode): Array<{ src: string; alt: string | null }> {
  const found: Array<{ src: string; alt: string | null }> = []
  doc.descendants((node) => {
    if (node.type.name === 'image') found.push({ src: node.attrs.src, alt: node.attrs.alt })
  })
  return found
}

describe('pasting Word content that carries a selection bitmap', () => {
  test('plain text does not sprout a picture of itself', async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, {
        html: '<p class="MsoNormal">Hello <b>world</b></p>',
        text: 'Hello world',
        files: [pngFile()],
      })

      expect(view.state.doc.textContent).toBe('Hello world')
      expect(images(view.state.doc)).toEqual([])
    } finally {
      destroy()
    }
  })

  test('an embedded image survives and the bitmap is not appended alongside it', async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, {
        html: `<p class="MsoNormal">Before</p><p class="MsoNormal"><img src="${PNG_DATA_URL}" alt="Figure 1"></p><p class="MsoNormal">After</p>`,
        files: [pngFile()],
      })

      expect(view.state.doc.textContent).toBe('BeforeAfter')
      expect(images(view.state.doc)).toEqual([{ src: PNG_DATA_URL, alt: 'Figure 1' }])
    } finally {
      destroy()
    }
  })

  test("an unloadable file:/// image is left in place, not replaced by a screenshot of the text around it", async () => {
    const { view, destroy } = makeEditor()
    try {
      const wordSrc = 'file:///C:/Users/x/AppData/Local/Temp/msohtmlclip/clip_image001.png'
      await paste(view, {
        html: `<p class="MsoNormal">Before</p><p class="MsoNormal"><img src="${wordSrc}"></p><p class="MsoNormal">After</p>`,
        files: [pngFile()],
      })

      expect(view.state.doc.textContent).toBe('BeforeAfter')
      expect(images(view.state.doc).map((image) => image.src)).toEqual([wordSrc])
    } finally {
      destroy()
    }
  })

  test('two unloadable images are left alone rather than one being hydrated from the single bitmap', async () => {
    const { view, destroy } = makeEditor()
    try {
      const first = 'file:///C:/Temp/clip_image001.png'
      const second = 'file:///C:/Temp/clip_image002.png'
      await paste(view, {
        html: `<p class="MsoNormal"><img src="${first}"></p><p class="MsoNormal"><img src="${second}"></p>`,
        files: [pngFile()],
      })

      expect(images(view.state.doc).map((image) => image.src)).toEqual([first, second])
    } finally {
      destroy()
    }
  })
})

describe('pasting where the clipboard images really are the content', () => {
  test('a lone picture copied out of Word is recovered from the clipboard bytes', async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, {
        html: '<p class="MsoNormal"><img src="file:///C:/Temp/clip_image001.png" width="300" height="200"></p>',
        files: [pngFile('clip_image001.png')],
      })

      expect(images(view.state.doc)).toEqual([{ src: PNG_DATA_URL, alt: 'clip_image001.png' }])
    } finally {
      destroy()
    }
  })

  test('a screenshot pasted with no HTML at all becomes an image', async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, { files: [pngFile('screenshot.png')] })

      // `alt` stays null on this path — a filename is noise to a screen reader, not a description.
      expect(images(view.state.doc)).toEqual([{ src: PNG_DATA_URL, alt: null }])
    } finally {
      destroy()
    }
  })
})

describe('counting the clipboard images', () => {
  /**
   * A real clipboard paste, unlike a synthetic `DataTransfer`, mints a fresh `File` on every
   * `getAsFile()` call — so the old `Set<File>` identity check never matched and each image was
   * counted twice, pasting the same picture twice. Only a stub can reproduce that: build a
   * `DataTransfer` here and the item caches a real `File`, hiding the bug.
   */
  test('an image reported by both items and files is inserted once', async () => {
    const { view, destroy } = makeEditor()
    try {
      const clipboardData = {
        files: [pngFile('shot.png')],
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => pngFile('shot.png') }],
        getData: () => '',
      } as unknown as DataTransfer

      const handlePaste = createSemanticPastePlugin().props.handlePaste!
      handlePaste.call({}, view, { clipboardData } as unknown as ClipboardEvent, Slice.empty)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(images(view.state.doc)).toEqual([{ src: PNG_DATA_URL, alt: null }])
    } finally {
      destroy()
    }
  })
})

/** The mark names on each text node of the document, in order. */
function textMarks(doc: PmNode): string[] {
  const found: string[] = []
  doc.descendants((node) => {
    if (node.isText) found.push(`${node.text}:${node.marks.map((mark) => mark.type.name).join('+')}`)
  })
  return found
}

describe('pasting bold and italic', () => {
  test('foreign <b> and <i> arrive as strong and em, the marks the editor itself makes', async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, { html: '<p>A <b>bold</b> and <i>italic</i> word</p>', text: 'A bold and italic word' })
      expect(textMarks(view.state.doc)).toEqual(['A :', 'bold:strong', ' and :', 'italic:em', ' word:'])
    } finally {
      destroy()
    }
  })

  test('a b mark copied inside a ProseMirror editor stays a b mark', async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, { html: '<p data-pm-slice="1 1 []">A <b>bold</b> word</p>', text: 'A bold word' })
      expect(textMarks(view.state.doc)).toEqual(['A :', 'bold:b', ' word:'])
    } finally {
      destroy()
    }
  })
})

describe('classes and ids on pasted content', () => {
  /** `[class, id]` of every paragraph in the document. */
  function paragraphAttrs(doc: PmNode): Array<[unknown, unknown]> {
    const found: Array<[unknown, unknown]> = []
    doc.descendants((node) => {
      if (node.type.name === 'paragraph') found.push([node.attrs.class, node.attrs.id])
    })
    return found
  }

  const WORD = '<p class="MsoNormal">Plain</p><p class="MsoNormal qti-align-center" id="_Hlk1">Centred</p>'

  test('by default no foreign class is imported, and no id', async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, { html: WORD })

      expect(paragraphAttrs(view.state.doc)).toEqual([[null, null], [null, null]])
    } finally {
      destroy()
    }
  })

  test('keepClass decides which class tokens survive (prose-qti keeps qti-*)', async () => {
    const { view, destroy } = makeEditor({ keepClass: (token) => token.startsWith('qti-') })
    try {
      await paste(view, { html: WORD })

      expect(paragraphAttrs(view.state.doc)).toEqual([[null, null], ['qti-align-center', null]])
    } finally {
      destroy()
    }
  })

  test("a web page's classes and ids are not imported", async () => {
    const { view, destroy } = makeEditor()
    try {
      await paste(view, { html: '<p class="article-body" id="intro"><strong class="hl">Hello</strong></p>' })

      expect(paragraphAttrs(view.state.doc)).toEqual([[null, null]])
      let strong: unknown
      view.state.doc.descendants((node) => {
        const mark = node.marks.find((m) => m.type.name === 'strong')
        if (mark) strong = mark.attrs.class
      })
      expect(strong).toBeNull()
    } finally {
      destroy()
    }
  })

  test('content copied out of a ProseMirror editor keeps its classes, whatever keepClass says', async () => {
    const { view, destroy } = makeEditor()
    try {
      // What `serializeForClipboard` writes: the slice marker on the first element.
      await paste(view, { html: '<p data-pm-slice="0 0 []" class="kader">Boxed</p>' })

      expect(paragraphAttrs(view.state.doc)).toEqual([['kader', null]])
    } finally {
      destroy()
    }
  })
})
