import { Plugin, PluginKey } from 'prosemirror-state';

import type { EditorView } from 'prosemirror-view';
import type { Node as ProsemirrorNode } from 'prosemirror-model';

type NodeAttrsChangeDetail = {
  nodeType: string;
  tagName: string;
  attrs: Record<string, unknown>;
};

function shallowEqualRecord(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function resolveNodeAtDom(
  view: EditorView,
  dom: Element,
  expectedTypeName?: string,
): { pos: number; node: ProsemirrorNode } | null {
  try {
    const pos = view.posAtDOM(dom, 0);
    const resolved = view.state.doc.resolve(pos);

    // For non-atom container nodes, posAtDOM(dom, 0) often lands at first child.
    // Walk ancestors first so wrapper-node attr sync can target the correct node.
    if (expectedTypeName) {
      for (let depth = resolved.depth; depth > 0; depth -= 1) {
        const ancestor = resolved.node(depth);
        if (ancestor.type.name !== expectedTypeName) continue;
        return { pos: resolved.before(depth), node: ancestor };
      }
    }

    const node = view.state.doc.nodeAt(pos);
    if (!node) return null;
    return { pos, node };
  } catch {
    return null;
  }
}

export const nodeAttrsSyncPlugin = new Plugin({
  key: new PluginKey('node-attrs-sync-plugin'),
  view(view) {
    const onNodeAttrsChange = (event: Event) => {
      const custom = event as CustomEvent<NodeAttrsChangeDetail>;
      const detail = custom.detail;
      if (!detail || !detail.nodeType || !detail.tagName || !detail.attrs) return;

      const schemaType = view.state.schema.nodes[detail.nodeType];
      if (!schemaType) return;

      const target = custom.target;
      if (!(target instanceof Element)) return;

      const host = target.closest(detail.tagName);
      if (!host) return;

      const resolved = resolveNodeAtDom(view, host, schemaType.name);
      if (!resolved) return;

      if (resolved.node.type !== schemaType) return;

      const nextAttrs = {
        ...resolved.node.attrs,
        ...detail.attrs
      };

      if (shallowEqualRecord(resolved.node.attrs as Record<string, unknown>, nextAttrs)) return;

      view.dispatch(view.state.tr.setNodeMarkup(resolved.pos, undefined, nextAttrs));
    };

    view.dom.addEventListener('qti-prosemirror-node-attrs-change', onNodeAttrsChange as EventListener);

    return {
      destroy() {
        view.dom.removeEventListener('qti-prosemirror-node-attrs-change', onNodeAttrsChange as EventListener);
      }
    };
  }
});
