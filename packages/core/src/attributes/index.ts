/*
 * QTI Attributes Plugin
 * 
 * A ProseMirror plugin that emits editable attributes for the selected node
 * and its ancestors. This is the core logic - UI components consume the
 * events this plugin dispatches.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import type { Node as ProseMirrorNode } from 'prosekit/pm/model';
import type { EditorState } from 'prosekit/pm/state';
import { Plugin, PluginKey } from 'prosekit/pm/state';

// ============================================================================
// Types
// ============================================================================

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
   * Custom event name to dispatch. Defaults to "qti:attributes:update".
   */
  eventName?: string;

  /**
   * Target to dispatch events on.
   * @default document
   */
  eventTarget?: EventTarget;

  /**
   * Optional filter for which nodes are eligible.
   * @default node has attrs defined in schema
   */
  eligible?: (node: { type: { spec?: { attrs?: Record<string, unknown> } } }) => boolean;

  /**
   * Chooses which node should activate the attributes UI.
   * @default first collected node (selected node first, then ancestors)
   */
  trigger?: QtiAttributesTrigger;

  /**
   * Optional callback invoked on updates.
   */
  onUpdate?: (detail: SidePanelEventDetail, state: EditorState) => void;
}

// ============================================================================
// Plugin Implementation
// ============================================================================

const attributesPluginKey = new PluginKey('qti-attributes-panel');

function hasSchemaAttrs(node: ProseMirrorNode): boolean {
  return Object.keys(node.type.spec.attrs ?? {}).length > 0;
}

function collectSelectionNodesWithSchemaAttrs(
  state: EditorState,
  eligible: NonNullable<QtiAttributesOptions['eligible']>,
): SidePanelNodeDetail[] {
  const nodes: SidePanelNodeDetail[] = [];
  const { selection } = state;
  const { $from } = selection;
  const selectedNode = (selection as EditorState['selection'] & { node?: ProseMirrorNode }).node;

  if (selectedNode && eligible(selectedNode) && hasSchemaAttrs(selectedNode)) {
    nodes.push({
      type: selectedNode.type.name,
      attrs: selectedNode.attrs,
      pos: selection.from,
    });
  }

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (!eligible(node) || !hasSchemaAttrs(node)) continue;
    const pos = $from.before(depth);
    if (nodes.some(existing => existing.pos === pos && existing.type === node.type.name)) continue;
    nodes.push({
      type: node.type.name,
      attrs: node.attrs,
      pos,
    });
  }

  return nodes;
}

/**
 * Creates a ProseMirror extension that tracks selected nodes with schema attributes
 * and dispatches custom events when the selection changes.
 * 
 * UI components can listen to these events to display attribute editors.
 */
export function qtiAttributesExtension(options: QtiAttributesOptions = {}): Extension {
  const eventName = options.eventName ?? 'qti:attributes:update';
  const eventTarget = options.eventTarget ?? document;
  const eligible = options.eligible ?? (node => Object.keys(node.type.spec?.attrs ?? {}).length > 0);
  const trigger =
    options.trigger ??
    ((context: QtiAttributesTriggerContext) =>
      context.nodes.length > 0 ? context.nodes[0] : null);
  const onUpdate = options.onUpdate;

  return definePlugin(
    () =>
      new Plugin({
        key: attributesPluginKey,
        view(view) {
          const dispatchUpdate = (state: EditorState) => {
            const nodes = collectSelectionNodesWithSchemaAttrs(state, eligible);
            const activeNode = trigger({ state, nodes });
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

// Backwards-compatible alias
export const qtiSidePanelExtension = qtiAttributesExtension;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Updates attributes on a node at a given position.
 * Merges the provided attrs with existing attrs.
 */
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
