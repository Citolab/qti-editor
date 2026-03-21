/**
 * QTI Code Preview Plugin
 *
 * Core ProseMirror plugin that emits document state as JSON, HTML, and XML.
 * Subscribe to events to display or process the code output.
 */

import { definePlugin, htmlFromNode, jsonFromNode, type Extension } from 'prosekit/core';
import { Plugin, PluginKey } from 'prosekit/pm/state';
import type { EditorState } from 'prosekit/pm/state';

export interface QtiDocumentJson {
  type: string;
  content?: QtiNodeJson[];
}

export interface QtiNodeJson {
  type: string;
  attrs?: Record<string, unknown>;
  content?: QtiNodeJson[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

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

function htmlToXmlString(html: string): string {
  const wrapped = `<qti-item-body>${html}</qti-item-body>`;
  const parsed = new DOMParser().parseFromString(wrapped, 'application/xml');
  const parseError = parsed.querySelector('parsererror');

  if (parseError) {
    return wrapped;
  }

  return new XMLSerializer().serializeToString(parsed.documentElement);
}

function buildCodeDetail(state: EditorState): QtiCodeUpdateDetail {
  const json = jsonFromNode(state.doc) as QtiDocumentJson;
  const html = (() => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlFromNode(state.doc);
    return wrapper.firstElementChild?.innerHTML ?? '';
  })();

  return {
    json,
    html,
    xml: htmlToXmlString(html),
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
