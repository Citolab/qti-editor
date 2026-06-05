import {
  defineCommands,
  defineKeymap,
  defineNodeSpec,
  definePlugin,
  union,
  type Extension,
  type Union,
} from 'prosekit/core'
import { inputRules, wrappingInputRule } from 'prosemirror-inputrules'
import {
  bulletList,
  liftListItem,
  listItem,
  orderedList,
  splitListItem,
  wrapInList,
} from 'prosemirror-schema-list'

import type { Command } from 'prosekit/pm/state'
import type { NodeType } from 'prosekit/pm/model'

type BulletListSpecExtension = Extension<{ Nodes: { bullet_list: {} } }>
type OrderedListSpecExtension = Extension<{ Nodes: { ordered_list: { order: number } } }>
type ListItemSpecExtension = Extension<{ Nodes: { list_item: {} } }>

type ListCommandsExtension = Extension<{
  Commands: {
    toggleBulletList: []
    toggleOrderedList: []
  }
}>

export type ListExtension = Union<
  [BulletListSpecExtension, OrderedListSpecExtension, ListItemSpecExtension, ListCommandsExtension, Extension]
>

function defineBulletListSpec(): BulletListSpecExtension {
  return defineNodeSpec({
    name: 'bullet_list',
    group: 'block',
    content: 'list_item+',
    parseDOM: bulletList.parseDOM,
    toDOM: bulletList.toDOM,
  }) as BulletListSpecExtension
}

function defineOrderedListSpec(): OrderedListSpecExtension {
  return defineNodeSpec({
    name: 'ordered_list',
    group: 'block',
    content: 'list_item+',
    attrs: orderedList.attrs as any,
    parseDOM: orderedList.parseDOM,
    toDOM: orderedList.toDOM,
  }) as OrderedListSpecExtension
}

function defineListItemSpec(): ListItemSpecExtension {
  return defineNodeSpec({
    name: 'list_item',
    content: 'paragraph',
    defining: true,
    parseDOM: listItem.parseDOM,
    toDOM: listItem.toDOM,
  }) as ListItemSpecExtension
}

function toggleListCommand(listTypeName: 'bullet_list' | 'ordered_list'): () => Command {
  return () => (state, dispatch) => {
    const listType = state.schema.nodes[listTypeName] as NodeType | undefined
    const itemType = state.schema.nodes.list_item as NodeType | undefined
    if (!listType || !itemType) return false

    const { $from, $to } = state.selection
    let inMatchingList = false
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === listType) {
        inMatchingList = true
        break
      }
    }
    // also accept selection-end side
    if (!inMatchingList) {
      for (let d = $to.depth; d > 0; d--) {
        if ($to.node(d).type === listType) {
          inMatchingList = true
          break
        }
      }
    }

    if (inMatchingList) {
      return liftListItem(itemType)(state, dispatch)
    }
    return wrapInList(listType)(state, dispatch)
  }
}

function defineListCommands(): ListCommandsExtension {
  return defineCommands({
    toggleBulletList: toggleListCommand('bullet_list'),
    toggleOrderedList: toggleListCommand('ordered_list'),
  }) as ListCommandsExtension
}

function defineListKeymapExt(): Extension {
  return defineKeymap({
    Enter: (state, dispatch) => {
      const itemType = state.schema.nodes.list_item as NodeType | undefined
      if (!itemType) return false
      return splitListItem(itemType)(state, dispatch)
    },
  })
}

function defineListInputRules(): Extension {
  return definePlugin(({ schema }) => {
    const bullet = schema.nodes.bullet_list
    const ordered = schema.nodes.ordered_list
    const rules = []
    if (bullet) {
      rules.push(wrappingInputRule(/^\s*([-+*])\s$/, bullet))
    }
    if (ordered) {
      rules.push(
        wrappingInputRule(
          /^(\d+)\.\s$/,
          ordered,
          (match) => ({ order: +match[1] }),
          (match, node) => node.childCount + (node.attrs.order ?? 1) === +match[1],
        ),
      )
    }
    return inputRules({ rules })
  })
}

export function defineList(): ListExtension {
  return union(
    defineBulletListSpec(),
    defineOrderedListSpec(),
    defineListItemSpec(),
    defineListCommands(),
    defineListKeymapExt(),
    defineListInputRules(),
  ) as ListExtension
}
