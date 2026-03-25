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
import { defineList } from 'prosekit/extensions/list'
import { defineParagraph } from 'prosekit/extensions/paragraph'
import { defineText } from 'prosekit/extensions/text'

export function defineBasicExtension() {
  return union(
    defineDoc(),
    defineText(),
    defineParagraph(),
    defineHeading(),
    defineList(),
    defineImage(),
    defineItalic(),
    defineBold(),
    defineBaseKeymap(),
    defineBaseCommands(),
    defineHistory(),
  )
}
