/*
 * QTI side panel plugin for QTI Editor
 * Adds clickable icons to QTI nodes that open the side panel inspector.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import type { EditorState, Transaction } from 'prosekit/pm/state';
import { Plugin, PluginKey } from 'prosekit/pm/state';
import { Decoration, DecorationSet } from 'prosekit/pm/view';

export interface SidePanelEventDetail {
  type: string;
  attrs: Record<string, any>;
  pos: number;
}

export interface QtiSidePanelOptions {
  /**
   * Custom event name to dispatch. Defaults to "qti:side-panel:update".
   */
  eventName?: string;
}

const sidePanelPluginKey = new PluginKey('qti-side-panel');

/**
 * Find all QTI nodes in the document and create decorations with clickable icons
 */
function createQtiNodeDecorations(state: EditorState, eventName: string): DecorationSet {
  const decorations: Decoration[] = [];

  state.doc.descendants((node, pos) => {
    // Check if this is a QTI node
    if (node.type.name.startsWith('qti_')) {
      // Create node decoration that adds attributes to make positioning work
      const nodeDecoration = Decoration.node(pos, pos + node.nodeSize, {
        class: 'qti-node-with-inspector',
        'data-qti-type': node.type.name,
      });
      decorations.push(nodeDecoration);

      // Create a widget decoration with a clickable icon positioned after the node
      const icon = document.createElement('span');
      icon.className = 'qti-node-inspector-icon';
      icon.textContent = '⚙️';
      icon.title = `Edit ${node.type.name.replace(/^qti_/, '').replace(/_/g, ' ')}`;
      icon.contentEditable = 'false';
      icon.setAttribute('data-qti-type', node.type.name);

      // Handle click to emit event
      icon.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const detail: SidePanelEventDetail = {
          type: node.type.name,
          attrs: node.attrs,
          pos,
        };

        document.dispatchEvent(new CustomEvent(eventName, { detail }));
      });

      // Create widget positioned at the end of the node
      const widgetDecoration = Decoration.widget(pos + node.nodeSize, icon, {
        side: -1,
        ignoreSelection: true,
      });
      decorations.push(widgetDecoration);
    }

    return true; // Continue traversing
  });

  return DecorationSet.create(state.doc, decorations);
}

export function qtiSidePanelExtension(options: QtiSidePanelOptions = {}): Extension {
  const eventName = options.eventName ?? 'qti:side-panel:update';

  return definePlugin(
    () =>
      new Plugin({
        key: sidePanelPluginKey,

        state: {
          init(_, state) {
            return createQtiNodeDecorations(state, eventName);
          },
          apply(
            tr: Transaction,
            oldState: DecorationSet,
            _oldEditorState: EditorState,
            newEditorState: EditorState,
          ) {
            // If document changed, recreate decorations
            if (tr.docChanged) {
              return createQtiNodeDecorations(newEditorState, eventName);
            }
            // Otherwise, just map the decorations to new positions
            return oldState.map(tr.mapping, tr.doc);
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
  );
}
