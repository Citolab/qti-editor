/*
 * QTI attributes plugin for QTI Editor
 * Emits selection-aware attribute data so external panels can render controls.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import type { Node as ProseMirrorNode } from 'prosekit/pm/model';
import type { EditorState } from 'prosekit/pm/state';
import { Plugin, PluginKey } from 'prosekit/pm/state';
import { Decoration, DecorationSet } from 'prosekit/pm/view';
import {
  isInteractionNodeName,
  QTI_ATTRIBUTES_ANCHOR_CLASS,
} from './qti-attributes-panel.connector.js';

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

function findFirstInteractionAncestorRange(
  state: EditorState,
): { from: number; to: number } | null {
  const selectedNode = (
    state.selection as EditorState['selection'] & { node?: ProseMirrorNode }
  ).node;
  // For atom interactions (e.g. inline text-entry), anchor to the selected node range itself.
  if (selectedNode && isInteractionNodeName(selectedNode.type.name)) {
    return { from: state.selection.from, to: state.selection.to };
  }

  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (!isInteractionNodeName(node.type.name)) continue;
    return {
      from: $from.before(depth),
      to: $from.after(depth),
    };
  }
  return null;
}

function collectSelectionQtiNodes(
  state: EditorState,
  options: Required<Pick<QtiAttributesOptions, 'includeEmptyAttrs' | 'eligible'>>,
): SidePanelNodeDetail[] {
  const nodes: SidePanelNodeDetail[] = [];
  const { $from } = state.selection;
  const selectedNode = (
    state.selection as EditorState['selection'] & { node?: ProseMirrorNode }
  ).node;
  const selectedNodePos = state.selection.from;

  // NodeSelection is used for selectable atom nodes, which are not always captured by ancestor scan.
  if (selectedNode && options.eligible(selectedNode)) {
    if (options.includeEmptyAttrs || Object.keys(selectedNode.attrs ?? {}).length > 0) {
      nodes.push({ type: selectedNode.type.name, attrs: selectedNode.attrs, pos: selectedNodePos });
    }
  }

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (!options.eligible(node)) continue;
    if (!options.includeEmptyAttrs && (!node.attrs || Object.keys(node.attrs).length === 0)) {
      continue;
    }
    const pos = $from.before(depth);
    if (nodes.some(existing => existing.pos === pos && existing.type === node.type.name)) continue;
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
        props: {
          decorations(state) {
            const anchorRange = findFirstInteractionAncestorRange(state);
            if (!anchorRange) return null;
            return DecorationSet.create(state.doc, [
              Decoration.node(anchorRange.from, anchorRange.to, {
                class: QTI_ATTRIBUTES_ANCHOR_CLASS,
                'data-qti-attributes-anchor': 'true',
              }),
            ]);
          },
        },
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
