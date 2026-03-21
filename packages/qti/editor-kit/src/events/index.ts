/**
 * QTI Editor Events
 *
 * ProseMirror plugin that emits CustomEvents for document content changes
 * and selection changes.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import { DOMSerializer } from 'prosekit/pm/model';
import { Plugin, PluginKey } from 'prosekit/pm/state';

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

export interface QtiContentChangeEventDetail {
  json: QtiDocumentJson;
  html: string;
  timestamp: number;
}

export interface QtiSelectionChangeEventDetail {
  from: number;
  to: number;
  empty: boolean;
  timestamp: number;
}

export interface QtiEditorEventsOptions {
  contentChangeEvent?: string;
  selectionChangeEvent?: string;
  emitContentChanges?: boolean;
  emitSelectionChanges?: boolean;
  eventTarget?: EventTarget;
}

const editorEventsPluginKey = new PluginKey('qti-editor-events');

export function qtiEditorEventsExtension(options: QtiEditorEventsOptions = {}): Extension {
  const {
    contentChangeEvent = 'qti:content:change',
    selectionChangeEvent = 'qti:selection:change',
    emitContentChanges = true,
    emitSelectionChanges = true,
    eventTarget = document,
  } = options;

  let lastDocJson: string | undefined;

  return definePlugin(
    () =>
      new Plugin({
        key: editorEventsPluginKey,
        view(view) {
          if (emitContentChanges) {
            const json = view.state.doc.toJSON() as QtiDocumentJson;
            lastDocJson = JSON.stringify(json);

            const serializer = DOMSerializer.fromSchema(view.state.schema);
            const fragment = serializer.serializeFragment(view.state.doc.content);
            const div = document.createElement('div');
            div.appendChild(fragment);

            const detail: QtiContentChangeEventDetail = {
              json,
              html: div.innerHTML,
              timestamp: Date.now(),
            };

            eventTarget.dispatchEvent(new CustomEvent(contentChangeEvent, { detail, bubbles: true }));
          }

          return {
            update(updatedView, prevState) {
              const state = updatedView.state;

              if (emitContentChanges && !prevState.doc.eq(state.doc)) {
                const json = state.doc.toJSON() as QtiDocumentJson;
                const jsonStr = JSON.stringify(json);

                if (jsonStr !== lastDocJson) {
                  lastDocJson = jsonStr;

                  const serializer = DOMSerializer.fromSchema(state.schema);
                  const fragment = serializer.serializeFragment(state.doc.content);
                  const div = document.createElement('div');
                  div.appendChild(fragment);

                  const detail: QtiContentChangeEventDetail = {
                    json,
                    html: div.innerHTML,
                    timestamp: Date.now(),
                  };

                  eventTarget.dispatchEvent(new CustomEvent(contentChangeEvent, { detail, bubbles: true }));
                }
              }

              if (emitSelectionChanges && !prevState.selection.eq(state.selection)) {
                const detail: QtiSelectionChangeEventDetail = {
                  from: state.selection.from,
                  to: state.selection.to,
                  empty: state.selection.empty,
                  timestamp: Date.now(),
                };

                eventTarget.dispatchEvent(new CustomEvent(selectionChangeEvent, { detail, bubbles: true }));
              }
            },
          };
        },
      }),
  );
}

export function onQtiContentChange(
  listener: (event: CustomEvent<QtiContentChangeEventDetail>) => void,
  target: EventTarget = document,
  eventName = 'qti:content:change',
): () => void {
  const handler = listener as EventListener;
  target.addEventListener(eventName, handler);
  return () => target.removeEventListener(eventName, handler);
}

export function onQtiSelectionChange(
  listener: (event: CustomEvent<QtiSelectionChangeEventDetail>) => void,
  target: EventTarget = document,
  eventName = 'qti:selection:change',
): () => void {
  const handler = listener as EventListener;
  target.addEventListener(eventName, handler);
  return () => target.removeEventListener(eventName, handler);
}
