import { defineMarkSpec, defineNodeAttr, union, type Extension, type Union } from 'prosekit/core'

import { LANG_BLOCK_TYPES, langMarkSpec, langOf } from '../prosemirror/lang/lang.js'

import type { Attrs } from 'prosekit/pm/model'

export type LangMarkExtension = Extension<{
  Marks: {
    lang: Attrs
  }
}>

export type LangExtension = Union<[LangMarkExtension, Extension]>

/**
 * `lang` for a ProseKit editor: the `lang` mark for `<span lang>`, and a `lang` attribute on
 * paragraphs, headings and lists. The same specs a plain-ProseMirror schema takes from
 * `@citolab/prose-extensions/lang` (`langMarkSpec`, `withLangAttr`) — see there for what is and is
 * not covered.
 *
 * The attribute is `splittable`: Enter at the end of an English paragraph starts another English
 * paragraph.
 */
export function defineLang(): LangExtension {
  return union(
    defineMarkSpec({ name: 'lang', ...langMarkSpec }) as LangMarkExtension,
    ...LANG_BLOCK_TYPES.map(type =>
      defineNodeAttr<string, 'lang', string | null>({
        type,
        attr: 'lang',
        default: null,
        validate: 'string|null',
        splittable: true,
        parseDOM: element => langOf(element),
        toDOM: value => (value ? ['lang', value] : null),
      }),
    ),
  ) as LangExtension
}
