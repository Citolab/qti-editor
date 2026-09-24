import { Fragment } from 'prosemirror-model';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Transaction } from 'prosemirror-state';

const DEFAULT_WRAPPER_TYPE_NAMES = ['blockquote'];
const DEFAULT_LIST_TYPE_NAMES = ['bullet_list', 'ordered_list'];
const DEFAULT_LIST_ITEM_TYPE_NAME = 'list_item';

export interface ClearFormattingRange {
  from: number;
  to: number;
}

export interface ClearFormattingOptions {
  /** Node type name every reset textblock becomes. Defaults to `'paragraph'`. */
  targetTextblockTypeName?: string;
  /**
   * Wrapper node types whose *own* content is already plain block content
   * (e.g. `blockquote`, whose children are the paragraphs/headings it quotes).
   * Dissolved by lifting that content straight out.
   */
  wrapperTypeNames?: string[];
  /**
   * List container types (e.g. `bullet_list`, `ordered_list`) whose children
   * are `listItemTypeName` wrappers, not block content directly. Dissolved by
   * unwrapping each item and taking *its* children as the flattened content.
   */
  listTypeNames?: string[];
  /** The per-entry wrapper node inside a list type. Defaults to `'list_item'`. */
  listItemTypeName?: string;
}

/**
 * Strips every mark and flattens structural wrappers/textblock types back to
 * plain paragraphs within `range`, mutating `tr` in place.
 *
 * `range` must already be valid for `tr.doc` — when calling this more than
 * once against the same `tr` (e.g. once per selected sub-range), map each
 * range through `tr.mapping` first, and apply ranges in reverse document
 * order so an earlier edit never invalidates a not-yet-processed range.
 *
 * Has no notion of QTI or interaction nodes: a caller that needs to leave
 * certain subtrees untouched must exclude them from `range` itself (see
 * `@citolab/prose-qti`'s clear-formatting command, which splits the selection
 * around interaction nodes before calling this).
 */
export function clearFormattingInRange(
  tr: Transaction,
  range: ClearFormattingRange,
  options: ClearFormattingOptions = {},
): boolean {
  const wrapperTypeNames = new Set(options.wrapperTypeNames ?? DEFAULT_WRAPPER_TYPE_NAMES);
  const listTypeNames = new Set(options.listTypeNames ?? DEFAULT_LIST_TYPE_NAMES);
  const listItemTypeName = options.listItemTypeName ?? DEFAULT_LIST_ITEM_TYPE_NAME;
  const targetTypeName = options.targetTextblockTypeName ?? 'paragraph';

  let { from, to } = range;
  if (from >= to) return false;

  const targetType = tr.doc.type.schema.nodes[targetTypeName];
  if (!targetType) return false;

  const dissolvableTypeNames = new Set([...wrapperTypeNames, ...listTypeNames]);

  let changed = false;

  // 1. Strip every mark across the whole range in one step. Doesn't change
  // doc size, so `from`/`to` stay valid for the steps below.
  tr.removeMark(from, to);
  changed = true;

  // Recursively reduce a wrapper node's subtree to a flat run of block
  // content: a nested wrapper is dissolved in place (depth-first), and every
  // textblock that isn't already `targetType` is rebuilt as one.
  function flatten(node: ProseMirrorNode): Fragment {
    let out = Fragment.empty;

    const visit = (child: ProseMirrorNode) => {
      if (dissolvableTypeNames.has(child.type.name)) {
        out = out.append(flatten(child));
        return;
      }
      if (child.isTextblock && child.type !== targetType) {
        out = out.append(Fragment.from(targetType.createChecked(null, child.content, child.marks)));
        return;
      }
      out = out.append(Fragment.from(child));
    };

    if (listTypeNames.has(node.type.name)) {
      // Each child is a list-item wrapper; its own children are the block content.
      node.forEach(item => {
        if (item.type.name === listItemTypeName) {
          item.forEach(visit);
        } else {
          visit(item);
        }
      });
    } else {
      node.forEach(visit);
    }

    return out;
  }

  // 2. Dissolve the outermost dissolvable wrapper nodes whose *reachable text*
  // is fully contained in [from, to]. Nested wrappers are handled inside
  // `flatten`, so this only collects the top-level ones.
  //
  // Checked against the innermost text boundary, not `pos+1`/`pos+nodeSize-1`:
  // a wrapper's immediate child is often itself a non-leaf node (blockquote's
  // child is a paragraph; a list-item's child is a paragraph too), so pos+1
  // only reaches the child's own opening delimiter, not its text. A selection
  // that merely spans "all the text inside this wrapper" — clicking into it
  // and selecting its line, or triple-clicking it — never reaches past that
  // structural delimiter, so comparing against it would refuse to dissolve
  // the wrapper for exactly the selections a real user produces.
  const wrappers: Array<{ pos: number; node: ProseMirrorNode }> = [];
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!dissolvableTypeNames.has(node.type.name)) return true;
    if (firstReachablePos(node, pos) < from || lastReachablePos(node, pos) > to) return true; // only fully-contained wrappers
    wrappers.push({ pos, node });
    return false;
  });

  for (let i = wrappers.length - 1; i >= 0; i -= 1) {
    const { pos, node } = wrappers[i];
    const mappedFrom = tr.mapping.map(pos, -1);
    const mappedTo = tr.mapping.map(pos + node.nodeSize, 1);
    tr.replaceWith(mappedFrom, mappedTo, flatten(node));
    changed = true;
  }

  from = tr.mapping.map(from, -1);
  to = tr.mapping.map(to, 1);

  // 3. Reset every remaining non-target textblock in [from, to] to the target
  // type. Same containment check as step 2, and for the same reason: "select
  // this heading's text" must be enough to retype it.
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock || node.type === targetType) return true;
    if (firstReachablePos(node, pos) < from || lastReachablePos(node, pos) > to) return true; // only fully-contained textblocks
    const $pos = tr.doc.resolve(pos);
    if (!$pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, targetType)) return true;
    tr.setNodeMarkup(pos, targetType, null, node.marks);
    changed = true;
    return false;
  });

  return changed;
}

/**
 * The earliest position actually reachable by a text selection inside `node`
 * (which sits at `pos`): `pos + 1`, then stepped one further inward for every
 * non-leaf, non-text node encountered while always following `firstChild` —
 * i.e. the first real content, not just the node's own opening delimiter.
 */
function firstReachablePos(node: ProseMirrorNode, pos: number): number {
  let innerPos = pos + 1;
  let child = node.firstChild;
  while (child && !child.isText && !child.isLeaf) {
    innerPos += 1;
    child = child.firstChild;
  }
  return innerPos;
}

/** The mirror of {@link firstReachablePos}, following `lastChild` from the end. */
function lastReachablePos(node: ProseMirrorNode, pos: number): number {
  let innerPos = pos + node.nodeSize - 1;
  let child = node.lastChild;
  while (child && !child.isText && !child.isLeaf) {
    innerPos -= 1;
    child = child.lastChild;
  }
  return innerPos;
}
