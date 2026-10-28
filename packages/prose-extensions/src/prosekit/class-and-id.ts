import { defineMarkAttr, defineNodeAttr, definePlugin, union, type Extension } from 'prosekit/core'
import { Plugin, PluginKey, type Transaction } from 'prosekit/pm/state'
import { Mapping } from 'prosekit/pm/transform'

import type { Node as PmNode } from 'prosekit/pm/model'

/**
 * `class` and `id` as node and mark attributes, so an item body keeps them through load → save.
 *
 * Without an attribute to hold them, ProseMirror's parser reads an element's tag and nothing else:
 * `<p class="qti-align-center">` came back as `<p>`, and an `id` that a stylesheet, a link, an
 * `aria-labelledby` or a PCI points at disappeared with it. Both are plain HTML global attributes on
 * QTI's content elements, and the `qti-*` utility classes of the shared QTI CSS are authored
 * content.
 *
 * `null` means "no attribute", so an element without them serialises exactly as before.
 *
 * - **class** is `splittable`: Enter in a centred paragraph gives a centred paragraph, the way an
 *   alignment button behaves.
 * - **id** is not: an id is unique. `splittable` only governs Enter at the END of a block, though —
 *   a split in the middle copies every attribute, and so does copy and paste — so
 *   {@link defineUniqueIds} clears the copy instead.
 *
 * Built on ProseKit's `defineNodeAttr` / `defineMarkAttr`, which wrap the type's existing
 * `parseDOM` and `toDOM` rather than replacing them — the type keeps its own rules and gains the two
 * attributes. The type must already be in the schema (ProseKit asserts it), so a host that adds a
 * node of its own — `defineHardBreak()`, say — adds these for it alongside:
 *
 * ```ts
 * union(defineBasicExtension(), defineHardBreak(), defineNodeClassAndId('hardBreak'))
 * ```
 */

/** What the two attributes hold: the attribute's value, or `null` when the element has none. */
export interface ClassAndIdAttrs {
  class: string | null
  id: string | null
}

export type NodeClassAndIdExtension<NodeName extends string> = Extension<{
  Nodes: { [K in NodeName]: ClassAndIdAttrs }
}>

export type MarkClassAndIdExtension<MarkName extends string> = Extension<{
  Marks: { [K in MarkName]: ClassAndIdAttrs }
}>

const readClass = (element: HTMLElement): string | null => element.getAttribute('class') || null
const readId = (element: HTMLElement): string | null => element.getAttribute('id') || null
const writeClass = (value: string | null): [string, string] | null => (value ? ['class', value] : null)
const writeId = (value: string | null): [string, string] | null => (value ? ['id', value] : null)

/** `class` and `id` attributes on an existing node type. */
export function defineNodeClassAndId<NodeName extends string>(
  type: NodeName,
): NodeClassAndIdExtension<NodeName> {
  return union(
    defineNodeAttr<NodeName, 'class', string | null>({
      type,
      attr: 'class',
      default: null,
      validate: 'string|null',
      splittable: true,
      parseDOM: readClass,
      toDOM: writeClass,
    }),
    defineNodeAttr<NodeName, 'id', string | null>({
      type,
      attr: 'id',
      default: null,
      validate: 'string|null',
      parseDOM: readId,
      toDOM: writeId,
    }),
  ) as unknown as NodeClassAndIdExtension<NodeName>
}

/** `class` and `id` attributes on an existing mark type. */
export function defineMarkClassAndId<MarkName extends string>(
  type: MarkName,
): MarkClassAndIdExtension<MarkName> {
  return union(
    defineMarkAttr<MarkName, 'class', string | null>({
      type,
      attr: 'class',
      default: null,
      validate: 'string|null',
      parseDOM: readClass,
      toDOM: writeClass,
    }),
    defineMarkAttr<MarkName, 'id', string | null>({
      type,
      attr: 'id',
      default: null,
      validate: 'string|null',
      parseDOM: readId,
      toDOM: writeId,
    }),
  ) as unknown as MarkClassAndIdExtension<MarkName>
}

/** Node ids in document order, with the position of each. */
function nodeIds(doc: PmNode): { id: string; pos: number }[] {
  const ids: { id: string; pos: number }[] = []
  doc.descendants((node, pos) => {
    const id: unknown = node.attrs.id
    if (typeof id === 'string' && id) ids.push({ id, pos })
  })
  return ids
}

/**
 * Keeps node ids unique: when an edit leaves two nodes with the same `id`, the copy loses it.
 *
 * An id is unique by definition (QTI's XSD types it `xs:ID`, so a duplicate makes the item invalid),
 * but ordinary editing copies it: Enter in the middle of a paragraph gives both halves the
 * paragraph's attributes, and so does pasting a copy of a block. The node that already had the id
 * keeps it — found by mapping its old position through the transaction — and the copy is cleared,
 * wherever it landed. Only optional ids (`default: null`) are touched.
 *
 * Marks are not checked: a mark's id lives on every text node it covers, and telling a copied mark
 * from the original needs more than a position.
 */
export function defineUniqueIds(): Extension {
  return definePlugin(
    new Plugin({
      key: new PluginKey('unique-ids'),
      appendTransaction(transactions, oldState, newState) {
        if (!transactions.some(tr => tr.docChanged)) return null

        const byId = new Map<string, number[]>()
        for (const { id, pos } of nodeIds(newState.doc)) {
          const positions = byId.get(id)
          if (positions) positions.push(pos)
          else byId.set(id, [pos])
        }
        const duplicated = [...byId].filter(([, positions]) => positions.length > 1)
        if (duplicated.length === 0) return null

        const mapping = new Mapping()
        for (const tr of transactions) mapping.appendMapping(tr.mapping)
        const before = new Map<string, number>()
        for (const { id, pos } of nodeIds(oldState.doc)) if (!before.has(id)) before.set(id, mapping.map(pos))

        let tr: Transaction | null = null
        for (const [id, positions] of duplicated) {
          const original = before.get(id)
          const keep = original !== undefined && positions.includes(original) ? original : positions[0]
          for (const pos of positions) {
            if (pos === keep) continue
            const node = newState.doc.nodeAt(pos)
            if (node?.type.spec.attrs?.id?.default !== null) continue
            tr ??= newState.tr
            tr.setNodeAttribute(pos, 'id', null)
          }
        }
        return tr
      },
    }),
  )
}
