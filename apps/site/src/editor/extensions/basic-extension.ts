import {
  defineBaseCommands,
  defineBaseKeymap,
  defineHistory,
  union,
  type BaseCommandsExtension,
  type BaseKeymapExtension,
  type HistoryExtension,
  type Union,
} from 'prosekit/core'
import { defineBold, type BoldExtension } from 'prosekit/extensions/bold'
import { defineDoc, type DocExtension } from 'prosekit/extensions/doc'
import { defineGapCursor, type GapCursorExtension } from 'prosekit/extensions/gap-cursor'
import { defineHardBreak, type HardBreakExtension } from 'prosekit/extensions/hard-break'
import { defineHeading, type HeadingExtension } from 'prosekit/extensions/heading'
import { defineImage, type ImageExtension } from 'prosekit/extensions/image'
import { defineItalic, type ItalicExtension } from 'prosekit/extensions/italic'
import { defineList, type ListExtension } from 'prosekit/extensions/list'
import { defineModClickPrevention, type ModClickPreventionExtension } from 'prosekit/extensions/mod-click-prevention'
import { defineParagraph, type ParagraphExtension } from 'prosekit/extensions/paragraph'
import { defineTable, type TableExtension } from 'prosekit/extensions/table'
import { defineText, type TextExtension } from 'prosekit/extensions/text'
import { defineVirtualSelection, type VirtualSelectionExtension } from 'prosekit/extensions/virtual-selection'

/**
 * @internal
 */
export type BasicExtension = Union<
  [
    // Nodes
    DocExtension,
    TextExtension,
    ParagraphExtension,
    HeadingExtension,
    ListExtension,
    ImageExtension,
    HardBreakExtension,
    TableExtension,
    // Marks
    ItalicExtension,
    BoldExtension,
    // Others
    BaseKeymapExtension,
    BaseCommandsExtension,
    HistoryExtension,
    GapCursorExtension,
    VirtualSelectionExtension,
    ModClickPreventionExtension,
  ]
>

export function defineBasicExtension(): BasicExtension {
  return union(
    // Nodes
    defineDoc(),
    defineText(),
    defineParagraph(),
    defineHeading(),
    defineList(),
    defineImage(),
    defineHardBreak(),
    defineTable(),
    // Marks
    defineItalic(),
    defineBold(),
    // Others
    defineBaseKeymap(),
    defineBaseCommands(),
    defineHistory(),
    defineGapCursor(),
    defineVirtualSelection(),
    defineModClickPrevention(),
  )
}
