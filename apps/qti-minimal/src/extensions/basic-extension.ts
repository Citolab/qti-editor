import {
  defineBaseCommands,
  defineBaseKeymap,
  defineHistory,
  union,
} from 'prosekit/core'
import { defineBold } from 'prosekit/extensions/bold'
import { defineDoc } from 'prosekit/extensions/doc'
import { defineHeading } from 'prosekit/extensions/heading'
import { defineImage } from 'prosekit/extensions/image'
import { defineItalic } from 'prosekit/extensions/italic'
import { defineParagraph } from 'prosekit/extensions/paragraph'
import { defineGapCursor } from 'prosekit/extensions/gap-cursor'
import { defineTable } from 'prosekit/extensions/table'
import { defineText } from 'prosekit/extensions/text'

import { defineList } from './list-extension'

export function defineBasicExtension() {
  return union(
    defineDoc(),
    defineText(),
    defineParagraph(),
    defineHeading(),
    defineList(),
    defineImage(),
    defineTable(),
    defineItalic(),
    defineBold(),
    defineBaseKeymap(),
    defineBaseCommands(),
    defineHistory(),
    defineGapCursor(),
  )
}
