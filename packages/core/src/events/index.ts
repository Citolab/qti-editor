/**
 * QTI Editor Events
 *
 * ProseMirror plugin that emits CustomEvents for document content changes
 * and selection changes. Consumers can listen to these events from anywhere
 * the editor is instantiated.
 *
 * Events emitted (by default on `document`):
 * - `qti:content:change` - When document content changes
 * - `qti:selection:change` - When selection changes
 */

import { definePlugin, type Extension } from 'prosekit/core';
import { DOMSerializer } from 'prosekit/pm/model';
import { Plugin, PluginKey } from 'prosekit/pm/state';

// ============================================================================
// Types
// ============================================================================

/**
 * JSON representation of a QTI document.
 */
export interface QtiDocumentJson {
  type: string;
  content?: QtiNodeJson[];
}

/**
 * JSON representation of a single QTI node.
 */
export interface QtiNodeJson {
  type: string;
  attrs?: Record<string, unknown>;
  content?: QtiNodeJson[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Event detail payload for content changes.
 */
export interface QtiContentChangeEventDetail {
  /** Document as JSON (ProseMirror structure) */
  json: QtiDocumentJson;
  /** Document as HTML string */
  html: string;
  /** Event timestamp */
  timestamp: number;
}

/**
 * Event detail payload for selection changes.
 */
export interface QtiSelectionChangeEventDetail {
  /** Selection start position */
  from: number;
  /** Selection end position */
  to: number;
  /** Whether selection is collapsed (cursor) */
  empty: boolean;
  /** Event timestamp */
  timestamp: number;
}

// ============================================================================
// Plugin Options
// ============================================================================

/**
 * Options for the QTI editor events plugin.
 */
export interface QtiEditorEventsOptions {
  /**
   * Event name for content changes.
   * @default 'qti:content:change'
   */
  contentChangeEvent?: string;

  /**
   * Event name for selection changes.
   * @default 'qti:selection:change'
   */
  selectionChangeEvent?: string;

  /**
   * Whether to emit content change events.
   * @default true
   */
  emitContentChanges?: boolean;

  /**
   * Whether to emit selection change events.
   * @default true
   */
  emitSelectionChanges?: boolean;

  /**
   * Target element to dispatch events on.
   * @default document
   */
  eventTarget?: EventTarget;
}

// ============================================================================
// Plugin
// ============================================================================

const editorEventsPluginKey = new PluginKey('qti-editor-events');

/**
 * Creates a ProseMirror extension that emits editor events.
 *
 * @example
 * ```ts
 * const extension = qtiEditorEventsExtension({
 *   contentChangeEvent: 'qti:content:change',
 *   selectionChangeEvent: 'qti:selection:change',
 *   eventTarget: document,
 * });
 * ```
 */
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
          // Emit initial state
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

              // Check for content changes
              if (emitContentChanges && !prevState.doc.eq(state.doc)) {
                const json = state.doc.toJSON() as QtiDocumentJson;
                const jsonStr = JSON.stringify(json);

                // Deduplicate rapid identical changes
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

              // Check for selection changes
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

// ============================================================================
// Helper: Typed event listeners
// ============================================================================

/**
 * Helper to add typed event listeners for QTI content change events.
 * Returns an unsubscribe function.
 *
 * @example
 * ```ts
 * const unsubscribe = onQtiContentChange((event) => {
 *   console.log('Document changed:', event.detail.json);
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 * ```
 */
export function onQtiContentChange(
  callback: (event: CustomEvent<QtiContentChangeEventDetail>) => void,
  options: { eventName?: string; target?: EventTarget } = {},
): () => void {
  const { eventName = 'qti:content:change', target = document } = options;
  target.addEventListener(eventName, callback as EventListener);
  return () => target.removeEventListener(eventName, callback as EventListener);
}

/**
 * Helper to add typed event listeners for selection changes.
 * Returns an unsubscribe function.
 *
 * @example
 * ```ts
 * const unsubscribe = onQtiSelectionChange((event) => {
 *   console.log('Selection:', event.detail.from, '-', event.detail.to);
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 * ```
 */
export function onQtiSelectionChange(
  callback: (event: CustomEvent<QtiSelectionChangeEventDetail>) => void,
  options: { eventName?: string; target?: EventTarget } = {},
): () => void {
  const { eventName = 'qti:selection:change', target = document } = options;
  target.addEventListener(eventName, callback as EventListener);
  return () => target.removeEventListener(eventName, callback as EventListener);
}
