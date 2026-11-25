import { defineNodeAttr, defineNodeSpec, union, type PlainExtension } from 'prosekit/core'

import type { DOMOutputSpec } from 'prosekit/pm/model'

/**
 * `class` on a table, its rows and its cells, so load → save keeps it.
 *
 * ProseKit's table nodes model no attributes besides the cell spans, so a class on any of them was
 * dropped on load. That loses author content: the QTI 3 shared vocabulary puts presentation on
 * classes — `qti-bordered` on a table and its cells is how an author asks for lines (a player draws
 * none without it) — and imported content carries its own classes too. See table-borders.ts for
 * the commands that set `qti-bordered`.
 */
export const TABLE_NODES = ['table', 'tableRow', 'tableCell', 'tableHeaderCell'] as const

const readClass = (el: HTMLElement) => el.getAttribute('class') || null
const writeClass = (value: string | null): [string, string] | null => (value ? ['class', value] : null)

export function defineTableClasses(): PlainExtension {
  return union(
    // The table writes `['table', ['tbody', 0]]`, which ProseKit's attribute wrapper takes for an
    // attrs object (it then writes attributes named 0 and 1); an explicit, empty attrs object gives
    // the class a place.
    defineNodeSpec({ name: 'table', toDOM: (): DOMOutputSpec => ['table', {}, ['tbody', 0]] }),
    ...TABLE_NODES.map((type) =>
      defineNodeAttr<string, string, string | null>({
        type,
        attr: 'class',
        default: null,
        // A split cell (or row) keeps its class on both halves: it is presentation, not identity.
        splittable: true,
        parseDOM: readClass,
        toDOM: writeClass,
      }),
    ),
  ) as PlainExtension
}
