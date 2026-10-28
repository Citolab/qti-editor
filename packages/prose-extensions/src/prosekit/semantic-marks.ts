import { defineMarkSpec, union, type Extension } from 'prosekit/core'
import { marks as basicMarks } from 'prosemirror-schema-basic'

import { semanticMarkSpecs } from '../prosemirror/semantic-marks/index.js'

import type { Attrs } from 'prosekit/pm/model'

/**
 * The inline phrasing marks an item body carries — `code`, `u`, `s`, `mark`, `q`, `sub`, `sup` and
 * `qtiUnderline` (`<span class="qti-underline">`) — as ProseKit mark specs.
 *
 * Schema only: no commands, keymaps or input rules. These exist so imported markup is kept, not as
 * a formatting toolbar; a host that wants a button for one adds it. See
 * `prosemirror/semantic-marks` for why each parses only its own tag, and why they are not ProseKit's
 * `defineUnderline` / `defineStrike` / `defineSubscript` / `defineSuperscript`.
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
 * ProseKit schema ranks `code, u, s, mark, q, sub, sup, qtiUnderline` exactly as `qtiBasicMarks`
 * does, after `em` / `strong`. `semantic-marks.browser.test.ts` in prose-qti pins the agreement.
 */
export type SemanticMarksExtension = Extension<{
  Marks: {
    code: Attrs
    u: Attrs
    s: Attrs
    mark: Attrs
    q: Attrs
    sub: Attrs
    sup: Attrs
    qtiUnderline: { class: string }
  }
}>

export function defineSemanticMarks(): SemanticMarksExtension {
  const inRankOrder = [
    defineMarkSpec({ name: 'code', ...basicMarks.code }),
    ...Object.entries(semanticMarkSpecs).map(([name, spec]) => defineMarkSpec({ name, ...spec })),
  ]
  return union(...inRankOrder.reverse()) as unknown as SemanticMarksExtension
}
