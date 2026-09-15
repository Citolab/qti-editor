/**
 * Generic interaction decorator — the node-action pill and the "clicked into" wash, for any
 * interaction.
 *
 * Every interaction gets the same two affordances when the author clicks into it:
 *
 *   wash  a class on the interaction's own element, so the theme can paint it gray
 *   pill  select / settings / duplicate / delete, floating at the interaction's edge
 *
 * Nothing here knows what an interaction contains. Per-type affordances (the choice interaction's
 * × and + for its options) stay in that interaction's own decorator; this one is for the seven
 * interactions that so far have nothing specific, and it is what a future specific decorator
 * builds on — see `choice/extensions/choice-decorations.ts`, which shares the activation rule and
 * the pill through this module.
 *
 * Both are view-only: they never enter the document, so exported XML is unaffected.
 *
 * Installed opt-in via a descriptor's `decoratorPluginFactories` — never through `pluginFactories`,
 * which every host installs unconditionally.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

import { nodeActionsWidget } from './node-decorations.js';

import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/**
 * Class the decorator puts on an interaction's element while the selection sits inside it and the
 * affordances are armed. "Clicked into" has no native selector — ProseMirror keeps DOM focus on the
 * editable root, so `:focus-within` never matches the interaction — hence a class, painted by
 * `decorations.css`.
 */
export const QTI_ACTIVE_INTERACTION_CLASS = 'qti-interaction--active';

export interface DecoratorActivationState {
  /**
   * Whether the "clicked into" affordances may show. Set by a mouse click (ProseMirror tags those
   * selection transactions with the `pointer` meta), cleared by any edit or by Escape.
   * Deliberately NOT re-armed by other selection changes: moving the caret with the arrow keys
   * while typing must not bring the affordances back. Which interaction they show on is still
   * decided per node from the selection.
   */
  active: boolean;
}

/** The activation rule, shared by every decorator so they arm and disarm together. */
export function applyDecoratorActivation(
  key: PluginKey<DecoratorActivationState>,
  tr: Transaction,
  prev: DecoratorActivationState
): DecoratorActivationState {
  // Escape (the meta) or any edit hides the affordances; only a click brings them back. Order
  // matters: a keystroke both changes the doc and moves the selection.
  if (tr.getMeta(key) || tr.docChanged) return { active: false };
  if (tr.getMeta('pointer')) return { active: true };
  return prev;
}

/** Escape disarms the decorator. Not claimed: a host may bind Escape as well. */
export function handleDecoratorEscape(
  key: PluginKey<DecoratorActivationState>,
  view: EditorView,
  event: KeyboardEvent
): boolean {
  if (event.key !== 'Escape' || !key.getState(view.state)?.active) return false;
  view.dispatch(view.state.tr.setMeta(key, true));
  return false;
}

export function selectionInsideNode(state: EditorState, pos: number, end: number): boolean {
  return state.selection.from >= pos && state.selection.to <= end;
}

export interface InteractionDecoratorOptions {
  /** The interaction's root ProseMirror node type, e.g. `qtiOrderInteraction`. */
  nodeTypeName: string;
  /** Its custom element tag, reported to the host by the settings action. */
  tagName: string;
}

/**
 * Wash + pill for one interaction type.
 *
 * Placement rule, same as the choice decorator: the pill is emitted *after* the node it belongs to.
 * That keeps it out of the custom element's slotted content and makes the decorated node a
 * *preceding sibling*, which is what CSS anchor positioning needs (an element cannot anchor to its
 * own ancestor). Anchor names are minted from the node's position so they are unique per node and
 * stable for as long as the node is; the pill's key includes the position for the same reason.
 */
export function createInteractionDecoratorPlugin(
  options: InteractionDecoratorOptions
): Plugin<DecoratorActivationState> {
  const { nodeTypeName, tagName } = options;
  const key = new PluginKey<DecoratorActivationState>(`qti-interaction-decorations-${nodeTypeName}`);

  const buildDecorations = (state: EditorState, active: boolean): DecorationSet => {
    const type = state.schema.nodes[nodeTypeName];
    if (!type) return DecorationSet.empty;

    const decorations: Decoration[] = [];

    state.doc.descendants((node, pos) => {
      if (node.type !== type) return true;

      const end = pos + node.nodeSize;
      const anchorName = `--qti-interaction-${pos}`;
      const inside = active && selectionInsideNode(state, pos, end);

      decorations.push(
        Decoration.node(pos, end, {
          style: `anchor-name: ${anchorName}`,
          ...(inside ? { class: QTI_ACTIVE_INTERACTION_CLASS } : {})
        })
      );

      if (inside) {
        decorations.push(nodeActionsWidget({ pos: end, nodeTypeName, tagName, anchorName }));
      }

      // Interactions don't nest.
      return false;
    });

    return DecorationSet.create(state.doc, decorations);
  };

  return new Plugin<DecoratorActivationState>({
    key,
    state: {
      init: () => ({ active: false }),
      apply: (tr, prev) => applyDecoratorActivation(key, tr, prev)
    },
    props: {
      decorations: state => buildDecorations(state, key.getState(state)?.active ?? false),
      handleKeyDown: (view, event) => handleDecoratorEscape(key, view, event)
    }
  });
}
