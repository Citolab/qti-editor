/**
 * QTI Code Preview Plugin
 *
 * Emits a CustomEvent with serialized HTML and JSON for the current document.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import { DOMSerializer } from 'prosekit/pm/model';
import { Plugin, PluginKey } from 'prosekit/pm/state';
import type { EditorState } from 'prosekit/pm/state';

export { QtiCodePanel } from './qti-code-panel.js';

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
  /**
   * Event name for code updates.
   * @default 'qti:code:update'
   */
  eventName?: string;

  /**
   * Target element to dispatch events on.
   * @default document
   */
  eventTarget?: EventTarget;

  /**
   * Whether to emit an initial payload on mount.
   * @default true
   */
  emitOnInit?: boolean;
}

const codePanelPluginKey = new PluginKey('qti-code-panel');

function htmlToXmlString(html: string): string {
  const wrapped = `<qti-item-body>${html}</qti-item-body>`;
  const parsed = new DOMParser().parseFromString(wrapped, 'application/xml');
  const parseError = parsed.querySelector('parsererror');

  if (parseError) {
    // Fall back to wrapped HTML if XML parsing fails due to malformed markup.
    return wrapped;
  }

  return new XMLSerializer().serializeToString(parsed.documentElement);
}

function buildCodeDetail(state: EditorState): QtiCodeUpdateDetail {
  const json = state.doc.toJSON() as QtiDocumentJson;
  const serializer = DOMSerializer.fromSchema(state.schema);
  const fragment = serializer.serializeFragment(state.doc.content);
  const html = (() => {
    const div = document.createElement('div');
    div.appendChild(fragment.cloneNode(true));
    return div.innerHTML;
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
