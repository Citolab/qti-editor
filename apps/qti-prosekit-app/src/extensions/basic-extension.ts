import { union, type Union } from 'prosekit/core'
import { defineHardBreak, type HardBreakExtension } from 'prosekit/extensions/hard-break'
import { defineModClickPrevention, type ModClickPreventionExtension } from 'prosekit/extensions/mod-click-prevention'
import { defineVirtualSelection, type VirtualSelectionExtension } from 'prosekit/extensions/virtual-selection'
import {
  defineBasicExtension as defineSharedBasicExtension,
  type BasicExtension as SharedBasicExtension,
} from '@citolab/prose-extensions/prosekit'

/**
 * This app's editor base: the shared QTI base plus what only this app adds.
 *
 * The shared base is what makes the schema QTI-shaped rather than ProseKit-shaped —
 * `ul` / `ol` / `li` rather than ProseKit's flat `<div class="prosemirror-flat-list">`,
 * and marks named `strong` / `em`. See `defineBasicExtension` in
 * `@citolab/prose-extensions/prosekit` for why that is not optional.
 *
 * @internal
 */
export type BasicExtension = Union<
  [SharedBasicExtension, HardBreakExtension, VirtualSelectionExtension, ModClickPreventionExtension]
>

export function defineBasicExtension(): BasicExtension {
  return union(
    defineSharedBasicExtension(),
    // Nodes
    defineHardBreak(),
    // Behaviour
    defineVirtualSelection(),
    defineModClickPrevention(),
  )
}
