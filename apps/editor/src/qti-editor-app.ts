import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';

// ProseKit core
import { LitElement, html, type PropertyValues } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { createEditor, union, type Editor } from 'prosekit/core';

// QTI plugins (using ProseKit adapters)
import { qtiEditorEventsExtension } from '@qti-editor/plugin-editor-events';
import { QtiAttributesPanel, qtiAttributesExtension } from '@qti-editor/plugin-qti-attributes';
import { QtiCodePanel, qtiCodePanelExtension } from '@qti-editor/plugin-qti-code';
import { defineQtiExtension } from '@qti-editor/plugin-qti-interactions/prosekit';

import { defineToolbarExtension } from '@qti-editor/plugin-toolbar';
import { blockSelectExtension } from '@qti-editor/prosemirror-block-select-plugin';
import { toolbarInsertMenus } from './toolbar/insert-menus';

export class QtiEditorApp extends LitElement {
  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private panelRef: Ref<QtiAttributesPanel>;
  private codePanelRef: Ref<QtiCodePanel>;
  private attributesEventTarget: EventTarget;
  private editorEventsTarget: EventTarget;
  private codeEventTarget: EventTarget;

  constructor() {
    super();

    this.attributesEventTarget = new EventTarget();
    this.editorEventsTarget = new EventTarget();
    this.codeEventTarget = new EventTarget();

    // Create the combined extension with QTI support and toolbar
    const extension = union(
      defineQtiExtension(),
      qtiAttributesExtension({
        eventTarget: this.attributesEventTarget,
        // Trigger stays in app code so the attributes UI remains decoupled from schema specifics.
        trigger: ({ state, nodes }) => {
          const isNodeSelection = Boolean((state.selection as any).node);
          if (!state.selection.empty && !isNodeSelection) return null;
          const interactionNodes = nodes.filter(node => /(interaction|prompt)$/i.test(node.type));
          if (interactionNodes.length === 0) return nodes[0] ?? null;

          // For NodeSelection, prefer the node that starts at the selected position.
          const exactMatch = interactionNodes.find(node => node.pos === state.selection.from);
          if (exactMatch) return exactMatch;

          // Otherwise prefer the innermost candidate (largest start position).
          return interactionNodes.reduce((best, node) => (node.pos > best.pos ? node : best));
        }
      }),
      qtiEditorEventsExtension({ eventTarget: this.editorEventsTarget }),
      qtiCodePanelExtension({ eventTarget: this.codeEventTarget }),
      defineToolbarExtension({
        getEditor: () => this.editor,
        insertMenus: toolbarInsertMenus
      }),
      blockSelectExtension
    );

    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();
    this.panelRef = createRef<QtiAttributesPanel>();
    this.codePanelRef = createRef<QtiCodePanel>();

    // example: use events from events plugin, probably not even necessary
    this.editorEventsTarget.addEventListener('qti:content:change', event => {
      console.log('qti:content:change', (event as CustomEvent).detail);
    });

    this.editorEventsTarget.addEventListener('qti:selection:change', event => {
      console.log('qti:selection:change', (event as CustomEvent).detail);
    });
  }

  override createRenderRoot() {
    return this;
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (this.editorRef.value) {
      this.editor.mount(this.editorRef.value);
    }

    if (this.panelRef.value) {
      this.panelRef.value.eventTarget = this.attributesEventTarget;
      (this.panelRef.value as QtiAttributesPanel).editorView = (this.editor as any).view ?? null;
    }

    if (this.codePanelRef.value) {
      this.codePanelRef.value.eventTarget = this.codeEventTarget;
    }
  }

  override render() {
    return html`
      <qti-attributes-panel ${ref(this.panelRef)}></qti-attributes-panel>
        <div
          class="card bg-white mt-12 rounded-md border border-solid border-gray-200 shadow-sm  text-black overflow-hidden"
        >
          <qti-lit-editor ${ref(this.editorRef)} class="card h-full min-h-80 flex flex-col px-32 py-8"></qti-lit-editor>
        </div>
        <qti-code-panel class="mt-10 w-full" ${ref(this.codePanelRef)}></qti-code-panel>

    `;
  }
}

// Register and initialize
customElements.define('qti-editor-app', QtiEditorApp);

declare global {
  interface HTMLElementTagNameMap {
    'qti-editor-app': QtiEditorApp
  }
}
