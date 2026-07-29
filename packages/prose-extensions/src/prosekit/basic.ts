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
import { defineDoc, type DocExtension } from 'prosekit/extensions/doc'
import { defineGapCursor, type GapCursorExtension } from 'prosekit/extensions/gap-cursor'
import { defineHeading, type HeadingExtension } from 'prosekit/extensions/heading'
import { defineImage, type ImageExtension } from 'prosekit/extensions/image'
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
    defineDoc(),
    defineNodeAttr({ type: 'doc', attr: 'title', default: '' }),
    defineNodeAttr({ type: 'doc', attr: 'identifier', default: '' }),
    defineText(),
    defineQtiParagraph(),
    defineHeading(),
    defineList(options?.list),
    defineImage(),
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
