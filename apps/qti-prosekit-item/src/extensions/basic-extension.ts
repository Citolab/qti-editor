import { union } from 'prosekit/core'
import { defineTextAlign } from 'prosekit/extensions/text-align'
import { defineBasicExtension as defineSharedBasicExtension } from '@citolab/prose-extensions/prosekit'

/**
 * This app's editor base: the shared QTI base plus what only this app adds.
 *
 * The shared base is what makes the schema QTI-shaped rather than ProseKit-shaped —
 * `ul` / `ol` / `li` rather than ProseKit's flat `<div class="prosemirror-flat-list">`,
 * and marks named `strong` / `em`. See `defineBasicExtension` in
 * `@citolab/prose-extensions/prosekit` for why that is not optional.
 *
 * List input rules are on here (typing `- ` or `1. ` starts a list) but off in the
 * main app.
 */
export function defineBasicExtension() {
  return union(
    defineSharedBasicExtension({ list: { inputRules: true } }),
    defineTextAlign({ types: ['paragraph', 'heading'] }),
  )
}
