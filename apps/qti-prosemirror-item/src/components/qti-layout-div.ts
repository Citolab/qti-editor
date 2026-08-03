/**
 * EXPERIMENT — lockable `qti-layout-*` layout divs.
 *
 * QTI items can wrap their body in presentation grids built from
 * `<div class="qti-layout-row">` / `<div class="qti-layout-colN">` wrappers
 * (see `public/qti/kennisnet/ITEM001.xml`). This experiment teaches the minimal
 * ProseMirror editor to:
 *
 * 1. Preserve those wrappers (and their exact `class`) across import/export. The
 *    node spec that does this MOVED to @citolab/prose-qti — the wrappers are
 *    author-written QTI and qti-components styles them, so the document model
 *    belongs to the package. It is re-exported here for existing callers.
 * 2. Lock the wrappers in place: they cannot be deleted or inserted. Their
 *    `class` *can* still be changed, and the content *inside* each column stays
 *    fully editable. Enforcement is a `filterTransaction` that rejects any
 *    transaction which changes how many layout divs the document contains.
 *
 * What is left here is the part that genuinely is app behaviour: `divLockPlugin`.
 *
 * Wire-up lives in `prosemirror-qti.ts`: the node now arrives with `qtiBasicNodes`,
 * and `divLockPlugin` is appended to `qtiPlugins`.
 */

import { Plugin } from 'prosemirror-state';
import { qtiLayoutDivNodeSpec } from '@citolab/prose-qti';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

/** Re-exported so existing imports keep working; the spec itself lives in the package now. */
export { qtiLayoutDivNodeSpec };

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
