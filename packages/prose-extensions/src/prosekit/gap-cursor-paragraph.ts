import { definePlugin, type Extension } from 'prosekit/core'
import { Plugin, TextSelection } from 'prosekit/pm/state'
import { GapCursor } from 'prosemirror-gapcursor'

/**
 * Typing at a gap cursor opens a paragraph.
 *
 * `defineGapCursor()` gets you to the collapsed space between two block nodes; it does not decide
 * what typing there produces, and ProseMirror's default answer is wrong for any schema with more
 * than one textblock in its block group.
 *
 * The default path is `replaceRange`, which wraps the bare text using
 * `contentMatchAt(index).findWrapping(schema.nodes.text)`. `findWrapping` is a breadth-first search
 * over the content match's edges and returns the SHORTEST wrapping — every textblock is depth one,
 * so every one of them ties, and the tie is broken by the order node types were registered in the
 * schema. That order is an implementation detail of how the extensions happen to be unioned.
 *
 * In the QTI editor's schema, measured, the block group's textblocks come out in this order:
 *
 *   qtiSimpleChoiceParagraph, qtiPromptParagraph, heading, paragraph
 *
 * so typing in a gap between two interactions produced an interaction-internal
 * `qtiSimpleChoiceParagraph` loose at item-body level — and once that was taken out of the block
 * group, a `heading`. `paragraph` is last and would never have won.
 *
 * Three fixes were tried before this one, and the first two are the interesting failures:
 *
 *   - `allowGapCursor: true` alone. Necessary — it is what makes the cursor exist at all, see the
 *     note on the `doc` spec — but it only governs REACHABILITY. It has no say in what typing does.
 *   - Pruning the block group. Removing `group: 'block'` from the interaction-internal textblocks is
 *     right on its own merits (a `qtiGapText` is not an item-body block) but it cannot fix this,
 *     because `heading` legitimately IS in the group and still outranks `paragraph`.
 *   - Reordering the schema so `paragraph` registers first. That is the vanilla ProseMirror
 *     situation, where `prosemirror-schema-basic` puts `paragraph` first and gap cursors therefore
 *     open paragraphs by luck rather than by design. Recreating that luck here would mean fighting
 *     ProseKit's union order for every future extension.
 *
 * So the intent is stated outright instead. `handleTextInput` runs before the default handling and
 * claims the keystroke, which also means no reliance on registration order survives: the paragraph
 * is named.
 *
 * Pair this with `allowGapCursor` on the containers that should have a gap cursor. Neither half is
 * useful alone — without the spec flag there is no cursor to type at, and without this the cursor is
 * a trap.
 */
export function defineGapCursorParagraph(): Extension {
  return definePlugin(
    () =>
      new Plugin({
        props: {
          handleTextInput(view, _from, _to, text) {
            const { selection, schema } = view.state
            if (!(selection instanceof GapCursor)) return false

            const paragraph = schema.nodes.paragraph
            if (!paragraph) return false

            const at = selection.from
            const node = paragraph.create(null, text ? schema.text(text) : null)
            // `createAndFill` is not needed and would be wrong: paragraph content is `inline*`, so
            // the node above is already valid, and filling could add nodes we did not ask for.
            if (!paragraph.validContent(node.content)) return false

            const tr = view.state.tr.replaceSelectionWith(node, false)
            // Caret after the text just typed: `at` is the gap, +1 enters the new paragraph.
            tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1 + text.length)))
            view.dispatch(tr.scrollIntoView())
            return true
          },
        },
      }),
  )
}
