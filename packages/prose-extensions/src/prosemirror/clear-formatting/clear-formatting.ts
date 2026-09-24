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

  // 2. Dissolve the outermost dissolvable wrapper nodes fully contained in
  // [from, to]. Nested wrappers are handled inside `flatten`, so this only
  // collects the top-level ones.
  const wrappers: Array<{ pos: number; node: ProseMirrorNode }> = [];
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!dissolvableTypeNames.has(node.type.name)) return true;
    if (pos < from || pos + node.nodeSize > to) return true; // only fully-contained wrappers
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

  // 3. Reset every remaining non-target textblock in [from, to] to the target type.
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock || node.type === targetType) return true;
    if (pos < from || pos + node.nodeSize > to) return true; // only fully-contained textblocks
    const $pos = tr.doc.resolve(pos);
    if (!$pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, targetType)) return true;
    tr.setNodeMarkup(pos, targetType, null, node.marks);
    changed = true;
    return false;
  });

  return changed;
}
