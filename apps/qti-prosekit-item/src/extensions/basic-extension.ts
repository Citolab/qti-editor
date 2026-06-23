import {
  defineBaseCommands,
  defineBaseKeymap,
  defineHistory,
  union,
} from 'prosekit/core'
import { defineDoc } from 'prosekit/extensions/doc'
import { defineHeading } from 'prosekit/extensions/heading'
import { defineImage } from 'prosekit/extensions/image'
import { defineParagraph } from 'prosekit/extensions/paragraph'
import { defineGapCursor } from 'prosekit/extensions/gap-cursor'
import { defineTable } from 'prosekit/extensions/table'
import { defineText } from 'prosekit/extensions/text'
import { defineTextAlign } from 'prosekit/extensions/text-align'
import { defineEm, defineList, defineStrong } from '@citolab/prose-extensions/prosekit'

export function defineBasicExtension() {
  return union(
    defineDoc(),
    defineText(),
    defineParagraph(),
    defineHeading(),
    defineList({ inputRules: true }),
    defineImage(),
    defineTable(),
    defineEm(),
    defineStrong(),
    defineBaseKeymap(),
    defineBaseCommands(),
    defineHistory(),
    defineGapCursor(),
    defineTextAlign({ types: ['paragraph', 'heading'] }),
  )
}
