import { defineMarkSpec, union, type Extension } from 'prosekit/core'
import { marks as basicMarks } from 'prosemirror-schema-basic'

import { phrasingMarkSpecs, type PhrasingMarkTag } from '../prosemirror/html-schema/index.js'

import type { Attrs } from 'prosekit/pm/model'

/**
 * The phrasing marks an item body carries — `code` plus `@citolab/prose-extensions/html-schema`'s
 * `phrasingMarkSpecs` (`b`, `i`, `small`, `big`, `tt`, `abbr`, `acronym`, `cite`, `dfn`, `kbd`,
 * `samp`, `var`, `q`, `sub`, `sup`, `bdo`, `bdi`) — as ProseKit mark specs.
 *
 * Schema only: no commands, keymaps or input rules. These exist so imported markup is kept, not as
 * a formatting toolbar; a host that wants a button for one adds it. See `phrasing-marks.ts` in
 * `html-schema` for which elements are here and why each parses only its own tag.
 *
 * `code` is prosemirror-schema-basic's spec, the one the plain-ProseMirror schema
 * (`qtiBasicMarks`) already has, so the two schema paths agree on it.
 *
 * ## Registered in reverse
 *
 * Mark order is rank, and rank decides nesting on export. A plain `Schema` ranks marks in the order
 * its `marks` object lists them; ProseKit ranks a later registration *higher*, so a union's marks
 * come out reversed (measured: `defineEm(), defineStrong()` ranks `strong` before `em`). These are
 * registered back to front, and `defineBasicExtension` registers them before `em` / `strong`, so the
 * ProseKit schema ranks `code` and the phrasing marks exactly as `qtiBasicMarks` does, after `em` /
 * `strong`. `phrasing-marks.browser.test.ts` in prose-qti pins the agreement.
 */
export type PhrasingMarksExtension = Extension<{
  Marks: { code: Attrs } & { [K in PhrasingMarkTag]: Attrs }
}>

export function definePhrasingMarks(): PhrasingMarksExtension {
  const inRankOrder = [
    defineMarkSpec({ name: 'code', ...basicMarks.code }),
    ...Object.entries(phrasingMarkSpecs).map(([name, spec]) => defineMarkSpec({ name, ...spec })),
  ]
  return union(...inRankOrder.reverse()) as unknown as PhrasingMarksExtension
}
