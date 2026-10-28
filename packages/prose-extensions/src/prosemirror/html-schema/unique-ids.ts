import { Plugin, PluginKey, type EditorState, type Transaction } from 'prosemirror-state';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Keeps node ids unique while editing: when an edit copies a node's `id`, the copy loses it.
 *
 * An id is unique by definition — QTI's XSD types it as an ID, so a duplicate makes the item invalid
 * — but ordinary editing copies it. Enter in the middle of a paragraph gives both halves the
 * paragraph's attributes, and pasting a copy of a block brings the block's id along.
 *
 * ## Only what the edit created
 *
 * The plugin looks only at nodes that begin inside a range the transaction changed — the nodes the
 * edit created — and clears a created node's id when another node already has it. Everything else
 * is left as it was:
 *
 * - **A loaded document is never rewritten.** Loading one (`EditorState.create`, ProseKit's
 *   `setContent`) is not a transaction, and an edit elsewhere creates no node with that id. So an
 *   item that arrived with duplicate ids keeps them, and saving it without touching them changes
 *   nothing; repairing someone else's markup is not this plugin's call.
 * - **Typing, marks and attribute changes** create no node, and cost no document scan. The whole
 *   document is read only when a created node carries an id.
 *
 * ## Which node keeps it
 *
 * The node that was there before the edit. One exception: Enter at the very start of a block splits
 * off an empty block in front, and that empty block is the one that sits at the original position.
 * The id stays with the content instead, so when the other node holding it is an empty textblock
 * and the created one is not, the empty one loses it.
 *
 * Only optional ids (`default: null`) are touched. Marks are not checked: a mark's id lives on every
 * text node it covers, and telling a copied mark from the original needs more than a position.
 */
export function createUniqueIdsPlugin(): Plugin {
  return new Plugin({
    key: new PluginKey('unique-ids'),
    appendTransaction(transactions, _oldState, newState) {
      const created = createdNodesWithIds(transactions, newState);
      if (created.size === 0) return null;

      // Every node holding one of those ids, in document order.
      const holders = new Map<string, number[]>();
      newState.doc.descendants((node, pos) => {
        const id = optionalId(node);
        if (id && created.has(id)) holders.set(id, [...(holders.get(id) ?? []), pos]);
      });

      let tr: Transaction | null = null;
      for (const [id, positions] of holders) {
        if (positions.length < 2) continue;
        const createdHere = created.get(id) ?? new Set<number>();
        const keep = keeper(newState.doc, positions, createdHere);
        for (const pos of positions) {
          if (pos === keep) continue;
          tr ??= newState.tr;
          tr.setNodeAttribute(pos, 'id', null);
        }
      }
      return tr;
    },
  });
}

/** `id` when the node has an optional, non-empty one. */
function optionalId(node: ProseMirrorNode): string | null {
  const id: unknown = node.attrs.id;
  if (typeof id !== 'string' || !id) return null;
  return node.type.spec.attrs?.id?.default === null ? id : null;
}

/**
 * The ids on nodes that start inside a changed range of the final document, with those nodes'
 * positions. A changed range is where a step replaced content; a node starting inside one was put
 * there by the edit.
 */
function createdNodesWithIds(transactions: readonly Transaction[], state: EditorState): Map<string, Set<number>> {
  const ranges: Array<[number, number]> = [];
  transactions.forEach((tr, index) => {
    tr.mapping.maps.forEach((map, stepIndex) => {
      map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
        // Through the rest of this transaction and the ones after it, into the final document.
        let from = newStart;
        let to = newEnd;
        for (let i = stepIndex + 1; i < tr.mapping.maps.length; i++) {
          from = tr.mapping.maps[i].map(from, -1);
          to = tr.mapping.maps[i].map(to, 1);
        }
        for (const later of transactions.slice(index + 1)) {
          from = later.mapping.map(from, -1);
          to = later.mapping.map(to, 1);
        }
        if (to > from) ranges.push([from, to]);
      });
    });
  });

  const created = new Map<string, Set<number>>();
  const size = state.doc.content.size;
  for (const [from, to] of ranges) {
    state.doc.nodesBetween(Math.max(0, from), Math.min(size, to), (node, pos) => {
      if (pos < from) return true; // an ancestor of the range, not created by it
      const id = optionalId(node);
      if (id) created.set(id, (created.get(id) ?? new Set()).add(pos));
      return true;
    });
  }
  return created;
}

/** The position that keeps the id: see "Which node keeps it" above. */
function keeper(doc: ProseMirrorNode, positions: number[], createdHere: Set<number>): number {
  const existing = positions.filter(pos => !createdHere.has(pos));
  if (existing.length !== 1) return existing[0] ?? positions[0];

  const [original] = existing;
  const originalNode = doc.nodeAt(original);
  if (originalNode?.isTextblock && originalNode.content.size === 0) {
    const withContent = positions.find(pos => createdHere.has(pos) && (doc.nodeAt(pos)?.content.size ?? 0) > 0);
    if (withContent !== undefined) return withContent;
  }
  return original;
}
