import { defineMarkAttr, defineNodeAttr, definePlugin, union, type Extension } from 'prosekit/core'

import {
  createUniqueIdsPlugin,
  globalAttrDomKey,
  readGlobalAttr,
  type GlobalAttrName,
  type GlobalAttrs,
} from '../prosemirror/html-schema/index.js'

/**
 * The global attributes of `html-schema/global-attrs.ts` (`class`, `id`, `lang`, `xml:lang`) on a
 * ProseKit node or mark type whose spec ProseKit or a host owns. The same readers and writers as
 * `withGlobalAttrs`, which a plain-ProseMirror schema uses, built on ProseKit's `defineNodeAttr` /
 * `defineMarkAttr`: those wrap the type's existing `parseDOM` and `toDOM` rather than replacing them.
 *
 * The type must already be in the schema (ProseKit asserts it), so a host that adds a node of its
 * own — `defineHardBreak()`, say — adds these for it alongside:
 *
 * ```ts
 * union(defineBasicExtension(), defineHardBreak(), defineNodeGlobalAttrs('hardBreak'))
 * ```
 *
 * ## `splittable`
 *
 * ProseKit only. `class`, `lang` and `xml:lang` are: Enter at the end of a centred or English
 * paragraph gives another one. `id` is not, since an id is unique; `splittable` only governs Enter
 * at the end of a block, so the unique-ids plugin ({@link defineUniqueIds}) clears an id a split in
 * the middle or a paste copies.
 */

const NAMES: readonly GlobalAttrName[] = ['class', 'id', 'lang', 'xmlLang']
const SPLITTABLE: ReadonlySet<GlobalAttrName> = new Set(['class', 'lang', 'xmlLang'])

export type NodeGlobalAttrsExtension<NodeName extends string> = Extension<{
  Nodes: { [K in NodeName]: GlobalAttrs }
}>

export type MarkGlobalAttrsExtension<MarkName extends string> = Extension<{
  Marks: { [K in MarkName]: GlobalAttrs }
}>

const write =
  (name: GlobalAttrName) =>
  (value: string | null): [string, string] | null =>
    value ? [globalAttrDomKey(name), value] : null

/** The global attributes on an existing node type. */
export function defineNodeGlobalAttrs<NodeName extends string>(type: NodeName): NodeGlobalAttrsExtension<NodeName> {
  return union(
    ...NAMES.map(name =>
      defineNodeAttr<NodeName, GlobalAttrName, string | null>({
        type,
        attr: name,
        default: null,
        validate: 'string|null',
        splittable: SPLITTABLE.has(name),
        parseDOM: element => readGlobalAttr(element, name),
        toDOM: write(name),
      }),
    ),
  ) as unknown as NodeGlobalAttrsExtension<NodeName>
}

/** The global attributes on an existing mark type. */
export function defineMarkGlobalAttrs<MarkName extends string>(type: MarkName): MarkGlobalAttrsExtension<MarkName> {
  return union(
    ...NAMES.map(name =>
      defineMarkAttr<MarkName, GlobalAttrName, string | null>({
        type,
        attr: name,
        default: null,
        validate: 'string|null',
        parseDOM: element => readGlobalAttr(element, name),
        toDOM: write(name),
      }),
    ),
  ) as unknown as MarkGlobalAttrsExtension<MarkName>
}

/** `createUniqueIdsPlugin()` from `html-schema/unique-ids.ts`, as a ProseKit extension. */
export function defineUniqueIds(): Extension {
  return definePlugin(createUniqueIdsPlugin())
}
