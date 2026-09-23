/**
 * Wraps an interaction's own rendered element in a bare `<div>`/`<span>`, so the generic decorator
 * (`interaction-decorations.ts`) can give the WRAPPER — not the interaction's own custom element —
 * its per-position `anchor-name`.
 *
 * `Decoration.node(pos, end, { style, class })` applies its style/class to whatever DOM element a
 * node's NodeView reports as `dom`. Without a NodeView, that is the interaction's own custom
 * element, and an ordinary interaction has nothing else that wants `anchor-name` on it — but
 * `qti-inline-choice-interaction` does, for its own dropdown popover, and a decorator-written inline
 * `style="anchor-name: ..."` silently overwrites whatever the component's own `:host` rule set.
 * Installing this NodeView makes the wrapper the node's `dom` instead, so the decorator's
 * `anchor-name` (and its "clicked into" wash class) land there, and the interaction's own element
 * — and whatever `anchor-name` its own stylesheet gives it — is never touched.
 *
 * The wrapper adds no margin, padding, border or explicit `display` of its own beyond the tag's
 * default (`<div>` is `block`, `<span>` is `inline`) — every interaction wired to this factory
 * already renders as `block`/`flex` (fills available width, like the wrapper) or `inline-flex`
 * (shrink-to-fit, like the wrapper), so the wrapper's box always coincides with the interaction's
 * own, and the pill still floats flush with the interaction's real edges exactly as it did when
 * anchored to the interaction directly.
 *
 * Built from the node's own `toDOM`, via `DOMSerializer.renderSpec`, rather than hand-rolling the
 * element: every interaction here returns the same `[tagName, attrsRecord, 0]` shape, so this stays
 * byte-for-byte what the default (no-NodeView) renderer would have produced. This changes WHERE the
 * interaction's element sits — one level deeper, inside the wrapper — never WHAT it is.
 */

import { DOMSerializer } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';

import type { Node as PmNode } from 'prosemirror-model';
import type { NodeView, ViewMutationRecord } from 'prosemirror-view';

/** Class every wrapper carries, purely as a debugging/selector hook — no rule targets it. */
export const QTI_INTERACTION_ANCHOR_WRAPPER_CLASS = 'qti-interaction-anchor-wrapper';

/**
 * Re-derives the DOM attrs `toDOM` would have produced for `node`, and writes only what changed —
 * additions, updates, removals — onto `dom`.
 *
 * Generic stand-in for the interaction-specific `applyAttrs` helpers gap-match and match-tabular's
 * own node views already hand-write: every interaction wired to this factory returns the common
 * `[tagName, attrsRecord, 0]` shape from `toDOM`, so its attrs can be read back out and reapplied
 * without a bespoke function per interaction.
 */
function reapplyToDOMAttrs(dom: HTMLElement, node: PmNode): void {
  const spec = node.type.spec.toDOM?.(node);
  const attrs =
    Array.isArray(spec) && typeof spec[1] === 'object' && !Array.isArray(spec[1]) && spec[1] !== null
      ? (spec[1] as Record<string, string>)
      : {};

  for (const { name } of Array.from(dom.attributes)) {
    if (!(name in attrs)) dom.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(attrs)) {
    if (dom.getAttribute(name) !== value) dom.setAttribute(name, value);
  }
}

export interface AnchorWrapperNodeViewOptions {
  nodeTypeName: string;
  /**
   * 'inline' for an inline-group node — the wrapper must stay a `<span>` so prose keeps flowing
   * around it; 'block' for everything else.
   */
  display: 'inline' | 'block';
}

export function createAnchorWrapperNodeViewPlugin(options: AnchorWrapperNodeViewOptions): Plugin {
  const { nodeTypeName, display } = options;

  return new Plugin({
    key: new PluginKey(`qti-interaction-anchor-wrapper-${nodeTypeName}`),
    props: {
      nodeViews: {
        [nodeTypeName](node: PmNode): NodeView {
          const toDOM = node.type.spec.toDOM;
          if (!toDOM) throw new Error(`${nodeTypeName} has no toDOM; cannot wrap it`);

          const { dom: inner, contentDOM } = DOMSerializer.renderSpec(document, toDOM(node));
          if (!(inner instanceof HTMLElement)) {
            throw new Error(`${nodeTypeName}'s toDOM did not produce an element`);
          }

          const wrapper = document.createElement(display === 'inline' ? 'span' : 'div');
          wrapper.className = QTI_INTERACTION_ANCHOR_WRAPPER_CLASS;
          wrapper.appendChild(inner);

          return {
            dom: wrapper,
            contentDOM: contentDOM instanceof HTMLElement ? contentDOM : undefined,
            update(newNode: PmNode): boolean {
              if (newNode.type.name !== nodeTypeName) return false;
              reapplyToDOMAttrs(inner, newNode);
              return true;
            },
            ignoreMutation(record: ViewMutationRecord): boolean {
              return record.type === 'attributes';
            },
          };
        },
      },
    },
  });
}
