import { Plugin } from 'prosemirror-state';

import type { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec } from 'prosemirror-model';

/**
 * The QTI layout wrappers — `<div class="qti-layout-row">` and `<div class="qti-layout-colN">`.
 *
 * ## Why this lives in the package and not in an app
 *
 * It looked app-private for a while, and was not. Three things say otherwise:
 *
 *   - The wrappers are **author-written in the source QTI**. They arrive in the XML; the editor did
 *     not invent them.
 *   - **qti-components styles them**, in its own theme, at
 *     `packages/qti-theme/src/styles/qti-native/qti3p0-override-layout.css` — the filename says what
 *     they are: a QTI 3.0 layout override.
 *   - The spec existed as **two byte-identical copies**, in QTI-Editor's ProseMirror app and in the
 *     Angular editor. Diffed and confirmed identical before this move.
 *
 * So it is item-format vocabulary, and the document model belongs to the package.
 *
 * ## The lock came with it
 *
 * An earlier split kept `qtiLayoutDivLockPlugin` in the app, on the reasoning that a document model
 * is the package's job while editing behaviour is the host's. That line does not survive contact:
 *
 *   - Both known hosts want the same answer, and both had the same plugin, verbatim. The node spec
 *     was moved here for exactly that reason one round earlier; leaving the plugin behind just
 *     restarted the clock on the same drift.
 *   - The boundary is not where it was drawn. `isolating` and `selectable: false` below are already
 *     editing behaviour, decided here. The lock is the third clause of that same sentence — without
 *     it those two are advisory, since a selection spanning the wrapper still deletes it.
 *   - Nothing can author one. The wrappers arrive from imported QTI and no editor offers a command
 *     to insert or remove them, so "how many are there" is a property of the imported item, not a
 *     thing an author decides. A host that shipped the node without the lock would let an author
 *     destroy structure they cannot recreate.
 *
 * It is a separate export rather than something automatic, so a host that genuinely wants editable
 * grids simply does not add it. Opting out is one omitted array entry; opting in, before, was
 * reimplementing this file.
 *
 * ## What omitting it costs
 *
 * Everything: a schema without this node silently DROPS every wrapper on import. That is not
 * theoretical — 8 of the 17 regression fixtures carry `qti-layout-*`, and with the node absent a
 * Node roundtrip of the corpus reproduces 9/17 of the committed snapshots. With it, 17/17.
 *
 * It has bitten before. `apps/e2e/stories/prosemirror-base.ts` records that only ITEM001/002 once
 * had it, so the other 15 stories dropped the wrappers and the theme's
 * `@media (width <= 767px)` rule appeared not to work in the editor — there was nothing left for it
 * to match.
 *
 * ## Shape
 *
 * One spec covers both row and column: both are block-level and hold block content, so the
 * distinction is carried entirely by the preserved `class` string.
 *
 * `isolating` keeps edits and Backspace/Delete joins from crossing the wrapper boundary;
 * `selectable: false` stops the wrapper being node-selected and deleted.
 */
const LAYOUT_CLASS_PREFIX = 'qti-layout-';

/** True when `className` marks a QTI layout wrapper (`qti-layout-row` / `-colN`). */
export function isQtiLayoutClass(className: string | null): boolean {
  return !!className && className.split(/\s+/).some(token => token.startsWith(LAYOUT_CLASS_PREFIX));
}

export const qtiLayoutDivNodeSpec: NodeSpec = {
  group: 'block',
  content: 'block+',
  attrs: {
    class: { default: null }
  },
  parseDOM: [
    {
      tag: 'div',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return false;
        const className = node.getAttribute('class');
        if (!isQtiLayoutClass(className)) return false;
        return { class: className };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.class) attrs.class = node.attrs.class as string;
    return ['div', attrs, 0];
  },
  defining: true,
  isolating: true,
  selectable: false,
  /*
   * Reachability of the collapsed space between the wrapper's children.
   *
   * `content: 'block+'` admits a paragraph anywhere inside, so a gap cursor is always legitimate
   * here — but prosemirror-gapcursor decides by reading `contentMatchAt(index).defaultType` and
   * asking whether THAT is a textblock. `defaultType` is the first admitted type with no required
   * attributes, which for `block+` is `qtiItemDivider`, and a divider is not a textblock. So the
   * guess says no at every position and two interactions sitting side by side in an imported
   * `qti-layout-row` have no writable space between them at all.
   *
   * `allowGapCursor` is the library's override for when the caller knows better than the heuristic.
   * See the longer note on the `doc` spec in the prosekit app's locked-header extension, which is
   * the same failure one level up.
   */
  allowGapCursor: true
};

/** How many layout wrappers this document contains. */
function layoutCount(doc: ProseMirrorNode): number {
  let count = 0;
  doc.descendants(node => {
    if (node.type.name === 'qtiLayoutDiv') count += 1;
    return true;
  });
  return count;
}

/**
 * Keep the layout wrappers exactly as the imported item had them.
 *
 * Rejects any transaction that changes how many `qtiLayoutDiv` nodes the document contains.
 * Everything else still works: editing inside a column, and changing a wrapper's own `class`, both
 * leave the count alone and pass through.
 *
 * ## Why a count, and not a stricter check
 *
 * A count is the weakest invariant that stops the only failure that matters — a wrapper being
 * deleted, usually as collateral in a selection that spanned it, leaving an author with structure
 * they have no command to rebuild. Comparing positions or classes instead would reject legitimate
 * edits inside the columns, which is most of what an author does in these items.
 *
 * `filterTransaction` is reject-only by design. It cannot repair or insert; a plugin that needs to
 * add a node wants `appendTransaction`. Protecting is exactly what is wanted here.
 *
 * Add it to the plugin list to opt in:
 *
 *     import { qtiLayoutDivLockPlugin } from '@citolab/prose-qti/schema';
 *     plugins: [...otherPlugins, qtiLayoutDivLockPlugin]
 */
export const qtiLayoutDivLockPlugin = new Plugin({
  filterTransaction(tr, state) {
    if (!tr.docChanged) return true;
    return layoutCount(state.doc) === layoutCount(tr.doc);
  }
});
