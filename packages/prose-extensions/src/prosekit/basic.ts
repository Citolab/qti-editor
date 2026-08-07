import {
  defineBaseCommands,
  defineBaseKeymap,
  defineHistory,
  defineNodeAttr,
  defineNodeSpec,
  union,
  type BaseCommandsExtension,
  type BaseKeymapExtension,
  type HistoryExtension,
  type Union,
} from 'prosekit/core'
import { type DocExtension } from 'prosekit/extensions/doc'
import { defineGapCursor, type GapCursorExtension } from 'prosekit/extensions/gap-cursor'
import { defineHeading, type HeadingExtension } from 'prosekit/extensions/heading'
import { defineImageCommands, type ImageExtension } from 'prosekit/extensions/image'
import {
  defineParagraphCommands,
  defineParagraphKeymap,
  type ParagraphExtension,
} from 'prosekit/extensions/paragraph'
import { defineTable, type TableExtension } from 'prosekit/extensions/table'
import { defineText, type TextExtension } from 'prosekit/extensions/text'

import { defineList, type ListExtension, type ListOptions } from './list.js'
import { defineEm, defineStrong, type EmExtension, type StrongExtension } from './strong-em.js'

/**
 * The base every ProseKit-based QTI editor in this repo builds on.
 *
 * ## Why this is not `prosekit/basic`
 *
 * ProseKit's own `defineBasicExtension()` is unusable for QTI, on two counts:
 *
 * 1. **Lists.** It ships a single flat `list` node that serialises to
 *    `<div class="prosemirror-flat-list" data-list-kind="bullet">` wrapping a
 *    `<div class="list-marker">` and a `<div class="list-content">`. QTI content is
 *    `ul` / `ol` / `li`, and `@qti-components/theme` styles those tags. Divs neither
 *    pick up that styling nor round-trip to QTI XML.
 * 2. **Mark names.** Its marks are named `bold` and `italic`. They do serialise to
 *    `<strong>` and `<em>`, so nothing renders wrong — but anything reading
 *    `schema.marks.strong` finds nothing, and the schema stops describing itself in
 *    QTI's vocabulary.
 *
 * `defineList` and `defineEm` / `defineStrong` in this package replace both: real
 * nested `ul` / `ol` / `li` reusing `prosemirror-schema-list`'s own parse and
 * serialise rules, and marks named for the tags they emit.
 *
 * ## The `richtext` group
 *
 * `qtiRubricBlock` has `content: 'richtext+'` — prose without interactions. The
 * prose nodes join that group here, once, so no host has to patch it in. That
 * patching is in fact impossible for paragraph: ProseKit's `defineParagraph()`
 * wraps its spec in `withPriority(spec, 4)` — the highest — so a later
 * `defineNodeSpec({ name: 'paragraph', group: 'block richtext' })` silently
 * loses the merge to paragraph's own `group: 'block'`, and rubric blocks end up
 * accepting everything but paragraphs. `defineQtiParagraph` below sidesteps it
 * by composing the paragraph node from ProseKit's exported parts and supplying
 * the spec itself, so the priority-4 spec is never in the union to begin with.
 *
 * ## Scope
 *
 * Only what every consumer needs. Editor-specific additions — text alignment, hard
 * breaks, selection decorations — are layered on by the consumer with `union()`.
 * Adding one here would silently change every editor's schema, and a node added to
 * the schema is a node that can appear in exported QTI.
 */
/**
 * ProseKit's doc node, rebuilt so an empty document fills with a paragraph.
 *
 * `defineDoc()` says `content: 'block+'`. ProseMirror answers "what goes in an empty doc?" with
 * `ContentMatch.defaultType` — the first edge of the content expression that is not text and has no
 * required attrs — and for a bare group reference that is whichever node happens to sit first in the
 * group. Here that is `qtiRubricBlock`, so selecting all and deleting left the author staring at an
 * empty feedback box rather than a blank line.
 *
 * Naming paragraph as the first alternative makes it the filler. The accepted node set does not
 * change: paragraph is already in `block`, so `(paragraph | block)+` admits and rejects exactly what
 * `block+` did.
 *
 * Rebuilt rather than patched with a second `defineNodeSpec({ name: 'doc', … })`. Measured: that
 * patch does not win the merge against `defineDoc()`'s own spec, and `content` stays `block+` —
 * the same trap documented above for paragraph's group. Supplying the spec ourselves means there is
 * nothing to lose the merge to.
 */
function defineQtiDoc(): DocExtension {
  return defineNodeSpec({
    name: 'doc',
    content: '(paragraph | block)+',
    topNode: true,
  }) as unknown as DocExtension
}

/**
 * The image node, shaped like ProseMirror's rather than ProseKit's.
 *
 * Same reasoning as `defineList`: where ProseKit's variant does not match the format we serialise
 * to, take the ProseMirror standard and extend it. ProseKit's image diverges from
 * `prosemirror-schema-basic` on all three points that matter here, and each one was a bug:
 *
 * | | prosemirror-schema-basic | ProseKit |
 * |---|---|---|
 * | level   | `inline`                  | `block`                              |
 * | attrs   | `src`, `alt`, `title`     | `src`, `width`, `height` — no `alt`  |
 * | parsing | reads the attributes      | measures `getBoundingClientRect()`   |
 *
 * 1. **Inline.** QTI's XSD does not allow `img` as a child of `qti-item-body`; it is phrasing
 *    content and needs a block parent. A block image can therefore only ever serialise to something
 *    the schema rejects, and it also cannot sit in a sentence — an icon or a maths glyph mid-text is
 *    ordinary assessment content. Inline makes `<p><img/></p>` parse and re-serialise unchanged.
 * 2. **`alt`.** ProseKit has no such attribute, so alternative text was destroyed on every
 *    import/export cycle — silently, and on assessment content, where it is an accessibility
 *    requirement rather than a nicety.
 * 3. **Attributes, not layout.** ProseKit derives width/height from `getBoundingClientRect()` and
 *    `naturalWidth`. During an import the DOM is detached, so both are 0 and the authored size is
 *    lost. Reading the attributes is also the only way to keep a percentage.
 *
 * `width` and `height` are `string`, not ProseKit's `number`. The sample items use `width="100%"`
 * as well as `width="250"`, and a numeric attr silently drops the percentage.
 *
 * Rebuilt rather than patched, like `defineQtiDoc` and `defineQtiParagraph` — see the note on
 * `defineQtiDoc` for why a second `defineNodeSpec` cannot be relied on to win the merge.
 * `defineImageCommands()` is ProseKit's and is reused unchanged.
 */
function defineQtiImage(): ImageExtension {
  return union(
    defineNodeSpec({
      name: 'image',
      inline: true,
      group: 'inline',
      draggable: true,
      attrs: {
        src: { default: null, validate: 'string|null' },
        alt: { default: null, validate: 'string|null' },
        title: { default: null, validate: 'string|null' },
        width: { default: null, validate: 'string|null' },
        height: { default: null, validate: 'string|null' },
      },
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs: (element: HTMLElement | string) => {
            if (typeof element === 'string') return { src: null }
            return {
              src: element.getAttribute('src') || null,
              alt: element.getAttribute('alt') || null,
              title: element.getAttribute('title') || null,
              width: element.getAttribute('width') || null,
              height: element.getAttribute('height') || null,
            }
          },
        },
      ],
      // prosemirror-model skips null values, so absent attributes stay absent on the way out.
      toDOM: node => ['img', node.attrs],
    }),
    defineImageCommands(),
  ) as unknown as ImageExtension
}

/**
 * ProseKit's paragraph node, rebuilt so its spec is ours to set.
 *
 * Identical to `defineParagraph()` apart from the `richtext` group membership
 * and the absence of the priority-4 wrapper — see the note above on why that
 * wrapper makes the group unpatchable from outside.
 */
function defineQtiParagraph(): ParagraphExtension {
  return union(
    defineNodeSpec({
      name: 'paragraph',
      content: 'inline*',
      group: 'block richtext',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    }),
    defineParagraphCommands(),
    defineParagraphKeymap(),
  ) as unknown as ParagraphExtension
}

export type BasicExtension = Union<
  [
    // Nodes
    DocExtension,
    TextExtension,
    ParagraphExtension,
    HeadingExtension,
    ListExtension,
    ImageExtension,
    TableExtension,
    // Marks
    EmExtension,
    StrongExtension,
    // Behaviour
    BaseKeymapExtension,
    BaseCommandsExtension,
    HistoryExtension,
    GapCursorExtension,
  ]
>

export interface BasicExtensionOptions {
  /** Passed through to {@link defineList}. Off by default, matching `defineList`. */
  list?: ListOptions
}

export function defineBasicExtension(options?: BasicExtensionOptions): BasicExtension {
  return union(
    // Nodes
    defineQtiDoc(),
    defineNodeAttr({ type: 'doc', attr: 'title', default: '' }),
    defineNodeAttr({ type: 'doc', attr: 'identifier', default: '' }),
    defineText(),
    defineQtiParagraph(),
    defineHeading(),
    defineList(options?.list),
    defineQtiImage(),
    defineTable(),
    // Table's own spec has no priority override, so a plain patch reaches it.
    defineNodeSpec({ name: 'table', group: 'block richtext' }),
    // Marks
    defineEm(),
    defineStrong(),
    // Behaviour
    defineBaseKeymap(),
    defineBaseCommands(),
    defineHistory(),
    defineGapCursor(),
  ) as BasicExtension
}
