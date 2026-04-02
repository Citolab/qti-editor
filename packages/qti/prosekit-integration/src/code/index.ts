/**
 * QTI Code Preview Plugin
 *
 * Core ProseMirror plugin that emits document state as JSON, HTML, and XML.
 * Subscribe to events to display or process the code output.
 */

import { definePlugin, jsonFromNode, type Extension } from 'prosekit/core';
import { ListDOMSerializer } from 'prosekit/extensions/list';
import { Plugin, PluginKey } from 'prosekit/pm/state';

import { xmlFromNode } from '../save-xml/index.js';

import type { EditorState } from 'prosekit/pm/state';
export type { QtiDocumentJson, QtiNodeJson } from '../types.js';
import type { QtiDocumentJson } from '../types.js';

export interface QtiCodeUpdateDetail {
  json: QtiDocumentJson;
  html: string;
  xml: string;
  timestamp: number;
}

export interface QtiCodePanelOptions {
  eventName?: string;
  eventTarget?: EventTarget;
  emitOnInit?: boolean;
}

const codePanelPluginKey = new PluginKey('qti-code-panel');

function buildCodeDetail(state: EditorState): QtiCodeUpdateDetail {
  const json = jsonFromNode(state.doc) as QtiDocumentJson;
  const serializer = ListDOMSerializer.fromSchema(state.schema);
  const fragment = serializer.serializeFragment(state.doc.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  const html = wrapper.firstElementChild?.innerHTML ?? '';

  return {
    json,
    html,
    xml: xmlFromNode(state.doc),
    timestamp: Date.now(),
  };
}

export function qtiCodePanelExtension(options: QtiCodePanelOptions = {}): Extension {
  const eventName = options.eventName ?? 'qti:code:update';
  const eventTarget = options.eventTarget ?? document;
  const emitOnInit = options.emitOnInit ?? true;

  let lastJson: string | undefined;

  return definePlugin(
    () =>
      new Plugin({
        key: codePanelPluginKey,
        view(view) {
          if (emitOnInit) {
            const detail = buildCodeDetail(view.state);
            lastJson = JSON.stringify(detail.json);
            eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
          }

          return {
            update(updatedView, prevState) {
              if (prevState.doc.eq(updatedView.state.doc)) return;
              const detail = buildCodeDetail(updatedView.state);
              const jsonStr = JSON.stringify(detail.json);
              if (jsonStr === lastJson) return;
              lastJson = jsonStr;
              eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
            },
          };
        },
      }),
  );
}
