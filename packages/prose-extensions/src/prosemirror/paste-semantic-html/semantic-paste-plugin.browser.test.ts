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
import { createSemanticPastePlugin } from './semantic-paste-plugin.js'

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

function makeEditor() {
  const editor = createEditor({
    extension: union(defineBasicExtension(), defineSemanticPasteExtension()),
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
