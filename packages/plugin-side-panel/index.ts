/*
 * QTI side panel plugin for QTI Editor
 * Adds clickable icons to QTI nodes that open the side panel inspector.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import type { EditorState } from 'prosekit/pm/state';
import { Plugin, PluginKey } from 'prosekit/pm/state';

export interface SidePanelNodeDetail {
  type: string;
  attrs: Record<string, any>;
  pos: number;
}

export interface SidePanelEventDetail {
  nodes: SidePanelNodeDetail[];
}

export interface QtiSidePanelOptions {
  /**
   * Custom event name to dispatch. Defaults to "qti:side-panel:update".
   */
  eventName?: string;
}

const sidePanelPluginKey = new PluginKey('qti-side-panel');

function collectSelectionQtiNodes(state: EditorState): SidePanelNodeDetail[] {
  const nodes: SidePanelNodeDetail[] = [];
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (!node.type.name.startsWith('qti_')) continue;
    if (!node.attrs || Object.keys(node.attrs).length === 0) continue;
    const pos = $from.before(depth);
    nodes.push({ type: node.type.name, attrs: node.attrs, pos });
  }

  return nodes;
}

export function qtiSidePanelExtension(options: QtiSidePanelOptions = {}): Extension {
  const eventName = options.eventName ?? 'qti:side-panel:update';

  return definePlugin(
    () =>
      new Plugin({
        key: sidePanelPluginKey,
        view(view) {
          const dispatchUpdate = (state: EditorState) => {
            const detail: SidePanelEventDetail = {
              nodes: collectSelectionQtiNodes(state),
            };
            document.dispatchEvent(new CustomEvent(eventName, { detail }));
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
