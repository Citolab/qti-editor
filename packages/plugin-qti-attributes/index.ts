/*
 * QTI attributes plugin for QTI Editor
 * Emits selection-aware attribute data so external panels can render controls.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import type { EditorState } from 'prosekit/pm/state';
import { Plugin, PluginKey } from 'prosekit/pm/state';

// ============================================================================
// Plugin Registration
// ============================================================================

export { QtiAttributesPanel } from './qti-attributes-panel';

export interface SidePanelNodeDetail {
  type: string;
  attrs: Record<string, any>;
  pos: number;
}

export interface SidePanelEventDetail {
  nodes: SidePanelNodeDetail[];
  activeNode: SidePanelNodeDetail | null;
  open: boolean;
}

export interface QtiAttributesTriggerContext {
  state: EditorState;
  nodes: SidePanelNodeDetail[];
}

export type QtiAttributesTrigger = (
  context: QtiAttributesTriggerContext,
) => SidePanelNodeDetail | null;

export interface QtiAttributesOptions {
  /**
   * Custom event name to dispatch. Defaults to "qti:side-panel:update".
   */
  eventName?: string;

  /**
   * Target to dispatch events on.
   * @default document
   */
  eventTarget?: EventTarget;

  /**
   * Whether to include nodes with empty attrs.
   * @default true
   */
  includeEmptyAttrs?: boolean;

  /**
   * Filter for which nodes are eligible.
   * @default node.type.name starts with "qti_"
   */
  eligible?: (node: { type: { name: string }; attrs?: Record<string, any> }) => boolean;

  /**
   * Chooses which node should activate the attributes UI.
   * Return null to keep the UI closed.
   * @default open on first eligible ancestor when selection is collapsed
   */
  trigger?: QtiAttributesTrigger;

  /**
   * Optional callback invoked on updates.
   */
  onUpdate?: (detail: SidePanelEventDetail, state: EditorState) => void;
}

const attributesPluginKey = new PluginKey('qti-attributes-panel');

function collectSelectionQtiNodes(
  state: EditorState,
  options: Required<Pick<QtiAttributesOptions, 'includeEmptyAttrs' | 'eligible'>>,
): SidePanelNodeDetail[] {
  const nodes: SidePanelNodeDetail[] = [];
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (!options.eligible(node)) continue;
    if (!options.includeEmptyAttrs && (!node.attrs || Object.keys(node.attrs).length === 0)) {
      continue;
    }
    const pos = $from.before(depth);
    nodes.push({ type: node.type.name, attrs: node.attrs, pos });
  }

  return nodes;
}

function hasEditableAttrs(node: SidePanelNodeDetail | null): node is SidePanelNodeDetail {
  if (!node) return false;
  return Object.keys(node.attrs ?? {}).length > 0;
}

export function qtiAttributesExtension(options: QtiAttributesOptions = {}): Extension {
  const eventName = options.eventName ?? 'qti:attributes:update';
  const eventTarget = options.eventTarget ?? document;
  const includeEmptyAttrs = options.includeEmptyAttrs ?? true;
  const eligible = options.eligible ?? ((node) => node.type.name.toLowerCase().startsWith('qti'));
  const trigger =
    options.trigger ??
    ((context: QtiAttributesTriggerContext) =>
      context.state.selection.empty ? (context.nodes[0] ?? null) : null);
  const onUpdate = options.onUpdate;

  return definePlugin(
    () =>
      new Plugin({
        key: attributesPluginKey,
        view(view) {
          const dispatchUpdate = (state: EditorState) => {
            const nodes = collectSelectionQtiNodes(state, { includeEmptyAttrs, eligible });
            const triggeredNode = trigger({ state, nodes });
            const activeNode = hasEditableAttrs(triggeredNode) ? triggeredNode : null;
            const detail: SidePanelEventDetail = {
              nodes,
              activeNode,
              open: Boolean(activeNode),
            };
            eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
            onUpdate?.(detail, state);
          };

          dispatchUpdate(view.state);

          return {
            update(updatedView, prevState) {
              if (
                prevState &&
                prevState.selection.eq(updatedView.state.selection) &&
                prevState.doc.eq(updatedView.state.doc)
              ) {
                return;
              }
              dispatchUpdate(updatedView.state);
            },
          };
        },
      }),
  );
}

// Backwards-compatible name
export const qtiSidePanelExtension = qtiAttributesExtension;

export function updateQtiNodeAttrs(
  view: { state: EditorState; dispatch: (tr: any) => void },
  pos: number,
  attrs: Record<string, any>,
): void {
  const { state, dispatch } = view;
  const node = state.doc.nodeAt(pos);
  if (!node) return;
  const nextAttrs = { ...node.attrs, ...attrs };
  dispatch(state.tr.setNodeMarkup(pos, undefined, nextAttrs));
}
