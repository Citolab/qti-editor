/**
 * EXPERIMENT — lockable `qti-layout-*` layout divs.
 *
 * QTI items can wrap their body in presentation grids built from
 * `<div class="qti-layout-row">` / `<div class="qti-layout-colN">` wrappers
 * (see `public/qti/kennisnet/ITEM001.xml`). This experiment teaches the minimal
 * ProseMirror editor to:
 *
 * 1. Preserve those wrappers (and their exact `class`) across import/export, by
 *    adding a single `qtiLayoutDiv` node to the schema. Only divs whose class
 *    starts with `qti-layout-` are matched; any other `<div>` is left to the
 *    default parser behaviour (ignored as a structural wrapper).
 * 2. Lock the wrappers in place: they cannot be deleted or inserted. Their
 *    `class` *can* still be changed, and the content *inside* each column stays
 *    fully editable. Enforcement is a `filterTransaction` that rejects any
 *    transaction which changes how many layout divs the document contains.
 *
 * Wire-up lives in `prosemirror-qti.ts` (Option A): `qtiLayoutDivNodeSpec` is
 * merged into the schema's nodes and `divLockPlugin` is appended to `qtiPlugins`.
 */

import { Plugin } from 'prosemirror-state';

import type { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec } from 'prosemirror-model';

const LAYOUT_CLASS_PREFIX = 'qti-layout-';

/** True when `className` marks a QTI layout wrapper (`qti-layout-row` / `-colN`). */
function isLayoutClass(className: string | null): boolean {
  return !!className && className.split(/\s+/).some(token => token.startsWith(LAYOUT_CLASS_PREFIX));
}

/**
 * A single generic node covering both the row and the column wrappers — both are
 * block-level and hold block content, so one spec serves the whole grid. The
 * exact `class` string is preserved verbatim so it round-trips unchanged.
 *
 * `isolating` keeps edits (and Backspace/Delete joins) from crossing the wrapper
 * boundary; `selectable: false` stops the wrapper itself from being node-selected
 * and deleted. The hard guarantee that the wrappers never change is enforced by
 * `divLockPlugin` below.
 */
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
        if (!isLayoutClass(className)) return false;
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
  selectable: false
};

/** Number of layout divs in the document. */
function layoutCount(doc: ProseMirrorNode): number {
  let count = 0;
  doc.descendants(node => {
    if (node.type.name === 'qtiLayoutDiv') count += 1;
    return true;
  });
  return count;
}

/**
 * Rejects any transaction that would add or remove a layout div. Transactions
 * that only edit a div's `class` or the content inside the columns keep the same
 * count and pass through, so re-classing and inner editing both keep working.
 */
export const divLockPlugin = new Plugin({
  filterTransaction(tr, state) {
    if (!tr.docChanged) return true;
    return layoutCount(state.doc) === layoutCount(tr.doc);
  }
});
