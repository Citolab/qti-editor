import type { Node as ProseMirrorNode } from 'prosekit/pm/model';
import type { EditorState, Transaction } from 'prosekit/pm/state';

/** Sentinel position for the doc node (it has no addressable document position). */
export const DOC_POS = -1;

export interface AttributesNodeDetail {
  type: string;
  attrs: Record<string, any>;
  /** {@link DOC_POS} when this entry is the doc node. */
  pos: number;
}

function hasSchemaAttrs(node: ProseMirrorNode): boolean {
  return Object.keys(node.type.spec.attrs ?? {}).length > 0;
}

/**
 * Collect the doc node + every ancestor of the selection that has schema attrs,
 * ordered outermost (doc) → innermost (selection). The doc node is emitted with
 * {@link DOC_POS} as its position (it has no addressable document position).
 */
export function collectSelectionNodesWithSchemaAttrs(state: EditorState): AttributesNodeDetail[] {
  const nodes: AttributesNodeDetail[] = [];
  const { selection } = state;
  const { $from } = selection;

  for (let depth = 0; depth <= $from.depth; depth++) {
    const node = $from.node(depth);
    if (!hasSchemaAttrs(node)) continue;
    nodes.push({
      type: node.type.name,
      attrs: node.attrs,
      pos: depth === 0 ? DOC_POS : $from.before(depth),
    });
  }

  // A NodeSelection targets a node directly (e.g. selecting an interaction);
  // append it if it isn't already the innermost ancestor.
  const selectedNode = (selection as EditorState['selection'] & { node?: ProseMirrorNode }).node;
  if (selectedNode && hasSchemaAttrs(selectedNode)) {
    const pos = selection.from;
    if (!nodes.some(existing => existing.pos === pos && existing.type === selectedNode.type.name)) {
      nodes.push({ type: selectedNode.type.name, attrs: selectedNode.attrs, pos });
    }
  }

  return nodes;
}

export function updateNodeAttrs(
  view: { state: EditorState; dispatch: (tr: Transaction) => void },
  pos: number,
  attrs: Record<string, any>,
): void {
  const { state, dispatch } = view;
  if (pos === DOC_POS) {
    let tr = state.tr;
    for (const [key, value] of Object.entries(attrs)) {
      tr = tr.setDocAttribute(key, value);
    }
    dispatch(tr);
    return;
  }
  const node = state.doc.nodeAt(pos);
  if (!node) return;
  const nextAttrs = { ...node.attrs, ...attrs };
  dispatch(state.tr.setNodeMarkup(pos, undefined, nextAttrs));
}
