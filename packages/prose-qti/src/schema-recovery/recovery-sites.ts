import type { RecoverySite } from './types.js';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/** A recovery site pinned to real positions in a real document. */
export interface ResolvedRecoverySite {
  id: string;
  /** Start of the marked range. Equal to `to` when nothing survived at the site. */
  from: number;
  to: number;
  /**
   * One range per node the site covers — because a site can cover several.
   *
   * `Decoration.node` describes exactly one node and is silently discarded if its range spans more
   * than one, which is the normal case here: unwrapping a node hands *all* of its children to the
   * parent, and marking them means one decoration each. Empty when nothing survived at the site.
   */
  ranges: Array<{ from: number; to: number }>;
  /** True when the marked content is inline, so a host marks a text range rather than a node. */
  inline: boolean;
  site: RecoverySite;
}

/**
 * Turns child-index paths into document positions, dropping any site that no longer fits.
 *
 * Sites are recorded against the salvaged JSON, and a host is free to keep working on that JSON
 * before it becomes a document — this editor, for one, re-imposes a required locked header. Every
 * such edit shifts indexes. Rather than trying to track those edits, each site carries the node type
 * it expects to find, and a mismatch means the site is discarded: a missing marker is a small loss,
 * while a marker pointing at innocent content is a lie about the user's document.
 */
export function resolveRecoverySites(
  doc: ProseMirrorNode,
  sites: readonly RecoverySite[],
): ResolvedRecoverySite[] {
  const resolved: ResolvedRecoverySite[] = [];

  for (const site of sites) {
    const located = locate(doc, site.path);
    if (!located) continue;

    const { parent, index, pos } = located;

    if (site.span === 0) {
      // Nothing survived here. The position between the surviving siblings is all there is to mark.
      resolved.push({
        id: site.id,
        from: pos,
        to: pos,
        ranges: [],
        inline: parent.inlineContent,
        site,
      });
      continue;
    }

    if (index + site.span > parent.childCount) continue;

    const first = parent.child(index);
    if (site.expectedType && first.type.name !== site.expectedType) continue;

    const ranges: Array<{ from: number; to: number }> = [];
    let to = pos;
    for (let offset = 0; offset < site.span; offset++) {
      const size = parent.child(index + offset).nodeSize;
      ranges.push({ from: to, to: to + size });
      to += size;
    }

    resolved.push({ id: site.id, from: pos, to, ranges, inline: first.isInline, site });
  }

  return resolved;
}

/** Walks a child-index path, returning the parent, the index within it, and the position before it. */
function locate(
  doc: ProseMirrorNode,
  path: readonly number[],
): { parent: ProseMirrorNode; index: number; pos: number } | null {
  // A zero-length path addresses the document itself, which has no position before it.
  if (path.length === 0) return null;

  let parent = doc;
  // Where the current parent's content starts: 0 for the document, one past the node otherwise.
  let contentStart = 0;

  for (let depth = 0; depth < path.length; depth++) {
    const index = path[depth];
    if (index < 0 || index > parent.childCount) return null;

    let pos = contentStart;
    for (let i = 0; i < index; i++) pos += parent.child(i).nodeSize;

    if (depth === path.length - 1) return { parent, index, pos };

    if (index >= parent.childCount) return null;
    const child = parent.child(index);
    if (child.isText) return null;
    parent = child;
    contentStart = pos + 1;
  }

  return null;
}
