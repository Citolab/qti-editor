import {
  defineCommands,
  defineKeymap,
  defineMarkSpec,
  toggleMark,
  union,
  type Extension,
  type Union,
} from 'prosekit/core'
import { marks as basicMarks } from 'prosemirror-schema-basic'

import type { Attrs } from 'prosekit/pm/model'

/**
 * Strong (bold) mark reusing the `strong` spec from `prosemirror-schema-basic`,
 * so the editor JSON stays compatible with that schema. Only the ProseKit
 * command/keymap layer is added on top.
 */
export type StrongCommandsExtension = Extension<{
  Commands: {
    toggleStrong: []
  }
}>

export type StrongSpecExtension = Extension<{
  Marks: {
    strong: Attrs
  }
}>

export type StrongExtension = Union<[StrongSpecExtension, StrongCommandsExtension]>

function defineStrongSpec(): StrongSpecExtension {
  return defineMarkSpec({
    name: 'strong',
    parseDOM: basicMarks.strong.parseDOM,
    toDOM: basicMarks.strong.toDOM,
  }) as StrongSpecExtension
}

function defineStrongCommands(): StrongCommandsExtension {
  return defineCommands({ toggleStrong: () => toggleMark({ type: 'strong' }) })
}

function defineStrongKeymap() {
  return defineKeymap({ 'Mod-b': toggleMark({ type: 'strong' }) })
}

export function defineStrong(): StrongExtension {
  return union(defineStrongSpec(), defineStrongCommands(), defineStrongKeymap())
}

/**
 * Emphasis (italic) mark reusing the `em` spec from `prosemirror-schema-basic`,
 * so the editor JSON stays compatible with that schema. Only the ProseKit
 * command/keymap layer is added on top.
 */
export type EmCommandsExtension = Extension<{
  Commands: {
    toggleEm: []
  }
}>

export type EmSpecExtension = Extension<{
  Marks: {
    em: Attrs
  }
}>

export type EmExtension = Union<[EmSpecExtension, EmCommandsExtension]>

function defineEmSpec(): EmSpecExtension {
  return defineMarkSpec({
    name: 'em',
    parseDOM: basicMarks.em.parseDOM,
    toDOM: basicMarks.em.toDOM,
  }) as EmSpecExtension
}

function defineEmCommands(): EmCommandsExtension {
  return defineCommands({ toggleEm: () => toggleMark({ type: 'em' }) })
}

function defineEmKeymap() {
  return defineKeymap({ 'Mod-i': toggleMark({ type: 'em' }) })
}

export function defineEm(): EmExtension {
  return union(defineEmSpec(), defineEmCommands(), defineEmKeymap())
}
