import { definePlugin, type Extension } from 'prosekit/core';
import { Plugin, PluginKey } from 'prosekit/pm/state';

import type { Node as ProseMirrorNode } from 'prosekit/pm/model';
import type { EditorState } from 'prosekit/pm/state';

export interface AttributesNodeDetail {
  type: string;
  attrs: Record<string, any>;
  pos: number;
}

export interface AttributesEventDetail {
  nodes: AttributesNodeDetail[];
  activeNode: AttributesNodeDetail | null;
  open: boolean;
}

export interface AttributesTriggerContext {
  state: EditorState;
  nodes: AttributesNodeDetail[];
}

export type AttributesTrigger = (
  context: AttributesTriggerContext,
) => AttributesNodeDetail | null;

export interface AttributesOptions {
  eventName?: string;
  eventTarget?: EventTarget;
  eligible?: (node: { type: { spec?: { attrs?: Record<string, unknown> } } }) => boolean;
  trigger?: AttributesTrigger;
  onUpdate?: (detail: AttributesEventDetail, state: EditorState) => void;
}

const attributesPluginKey = new PluginKey('attributes-panel');

function hasSchemaAttrs(node: ProseMirrorNode): boolean {
  return Object.keys(node.type.spec.attrs ?? {}).length > 0;
}

export function collectSelectionNodesWithSchemaAttrs(
  state: EditorState,
  eligible: NonNullable<AttributesOptions['eligible']>,
): AttributesNodeDetail[] {
  const nodes: AttributesNodeDetail[] = [];
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

export function attributesExtension(options: AttributesOptions = {}): Extension {
  const eventName = options.eventName ?? 'pm:attributes:update';
  const eventTarget = options.eventTarget ?? document;
  const eligible = options.eligible ?? (node => Object.keys(node.type.spec?.attrs ?? {}).length > 0);
  const trigger =
    options.trigger ??
    ((context: AttributesTriggerContext) =>
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
            const detail: AttributesEventDetail = {
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

export const sidePanelExtension = attributesExtension;

export function updateNodeAttrs(
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

export type SidePanelNodeDetail = AttributesNodeDetail;
export type SidePanelEventDetail = AttributesEventDetail;
export type QtiAttributesTriggerContext = AttributesTriggerContext;
export type QtiAttributesTrigger = AttributesTrigger;
export type QtiAttributesOptions = AttributesOptions;

export function qtiAttributesExtension(options: QtiAttributesOptions = {}): Extension {
  return attributesExtension({
    ...options,
    eventName: options.eventName ?? 'qti:attributes:update',
  });
}

export const qtiSidePanelExtension = qtiAttributesExtension;
export const updateQtiNodeAttrs = updateNodeAttrs;
