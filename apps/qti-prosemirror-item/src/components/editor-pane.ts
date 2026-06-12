/**
 * Editor pane — the center column: a toolbar (item title + export button) above
 * the ProseMirror editor host.
 *
 * A framework-free component. It owns the editor lifecycle for the currently
 * open item and notifies the caller via `onExport` (handing over the live
 * document) when the export button is pressed.
 */

import { mountEditor } from '../editor/editor.js';

import type { EditorView } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

export interface EditorPaneOptions {
  onExport: (doc: ProseMirrorNode) => void;
}

export class EditorPane {
  readonly #options: EditorPaneOptions;
  readonly #titleEl: HTMLElement;
  readonly #hostEl: HTMLElement;
  readonly #exportBtn: HTMLButtonElement;
  #view: EditorView | null = null;

  constructor(host: HTMLElement, options: EditorPaneOptions) {
    this.#options = options;

    host.innerHTML = `
      <div id="editor-toolbar">
        <span id="editor-title">Select an item to start editing.</span>
        <button id="export-btn" type="button" disabled>Export QTI</button>
      </div>
      <div id="editor-host"></div>
    `;

    this.#titleEl = host.querySelector<HTMLElement>('#editor-title')!;
    this.#hostEl = host.querySelector<HTMLElement>('#editor-host')!;
    this.#exportBtn = host.querySelector<HTMLButtonElement>('#export-btn')!;

    this.#exportBtn.addEventListener('click', () => {
      if (this.#view) this.#options.onExport(this.#view.state.doc);
    });
  }

  /** Mount an editor for `doc`, rendering the attributes panel into `panelEl`. */
  open(doc: ProseMirrorNode, panelEl: HTMLElement, title: string): void {
    this.#destroyView();
    this.#view = mountEditor(this.#hostEl, doc, panelEl);
    this.#titleEl.textContent = title;
    this.#exportBtn.disabled = false;
  }

  destroy(): void {
    this.#destroyView();
  }

  #destroyView(): void {
    this.#view?.destroy();
    this.#view = null;
    this.#hostEl.innerHTML = '';
  }
}
