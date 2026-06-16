import {
  defineCommands,
  defineKeymap,
  defineNodeSpec,
  definePlugin,
  union,
  type Extension,
  type Union,
} from 'prosekit/core'
import {
  chainCommands,
  deleteSelection,
  joinBackward,
  selectNodeBackward,
} from 'prosekit/pm/commands'
import { type Command } from 'prosekit/pm/state'
import { inputRules, wrappingInputRule } from 'prosemirror-inputrules'
import {
  bulletList,
  liftListItem,
  listItem,
  orderedList,
  splitListItem,
  wrapInList,
} from 'prosemirror-schema-list'

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

export interface ListOptions {
  /**
   * Enable markdown-style input rules: typing `- ` (or `* ` / `+ `) starts a
   * bullet list, and `1. ` starts an ordered list. Off by default.
   */
  inputRules?: boolean
}

function defineBulletListSpec(): BulletListSpecExtension {
  return defineNodeSpec({
    name: 'bullet_list',
    group: 'block richtext',
    content: 'list_item+',
    parseDOM: bulletList.parseDOM,
    toDOM: bulletList.toDOM,
  }) as BulletListSpecExtension
}

function defineOrderedListSpec(): OrderedListSpecExtension {
  return defineNodeSpec({
    name: 'ordered_list',
    group: 'block richtext',
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

    const bulletType = state.schema.nodes.bullet_list as NodeType | undefined
    const orderedType = state.schema.nodes.ordered_list as NodeType | undefined

    // Find the innermost ancestor list node (bullet or ordered) around the selection.
    const { $from } = state.selection
    let listDepth = -1
    for (let d = $from.depth; d > 0; d--) {
      const nodeType = $from.node(d).type
      if (nodeType === bulletType || nodeType === orderedType) {
        listDepth = d
        break
      }
    }

    if (listDepth !== -1) {
      const currentListType = $from.node(listDepth).type
      // Already this list type -> toggle off by lifting the items out.
      if (currentListType === listType) {
        return liftListItem(itemType)(state, dispatch)
      }
      // Other list type -> convert the existing list node into the target type.
      if (dispatch) {
        const pos = $from.before(listDepth)
        const attrs = listType === orderedType ? { order: 1 } : undefined
        dispatch(state.tr.setNodeMarkup(pos, listType, attrs))
      }
      return true
    }

    // Not in a list -> wrap the selection in the target list type.
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
    // Restore ProseMirror's standard Backspace behavior. Prosekit's base keymap
    // replaces `joinBackward` with `joinTextblockBackward`, which never lifts the
    // first list item out into a paragraph. `joinBackward` (the command used by
    // `prosemirror-commands`' `baseKeymap`, and therefore by the basic example and
    // `prosemirror-example-setup`) handles both lifting the first item and merging
    // later items into their predecessor.
    Backspace: chainCommands(deleteSelection, joinBackward, selectNodeBackward),
  })
}

/**
 * Markdown-style input rules: typing `- ` (or `* ` / `+ `) starts a bullet list,
 * and `1. ` starts an ordered list.
 */
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

export function defineList(options: ListOptions = {}): ListExtension {
  const extensions: Extension[] = [
    defineBulletListSpec(),
    defineOrderedListSpec(),
    defineListItemSpec(),
    defineListCommands(),
    defineListKeymapExt(),
  ]
  if (options.inputRules) {
    extensions.push(defineListInputRules())
  }
  return union(...extensions) as ListExtension
}
