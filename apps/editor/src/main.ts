import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import './style.css';

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
import { getFirebaseConfig } from './firebase-config';
import { toolbarInsertMenus } from './toolbar/insert-menus';

class QtiEditorApp extends LitElement {
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
          return nodes.find(node => /(interaction|prompt)$/i.test(node.type)) ?? nodes[0] ?? null;
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
      <main class="container mx-auto max-w-4xl">
        <div
          class="card bg-white mt-12 rounded-md border border-solid border-gray-200 shadow-sm  text-black overflow-hidden"
        >
          <div ${ref(this.editorRef)} class="card h-full min-h-80 flex flex-col px-32 py-8"></div>
        </div>
        <qti-code-panel class="mt-10 w-full" ${ref(this.codePanelRef)}></qti-code-panel>
      </main>
    `;
  }
}

// Register and initialize
customElements.define('qti-editor-app', QtiEditorApp);

document.addEventListener('DOMContentLoaded', () => {
  console.log('QTI Editor Demo initializing...');
  const firebaseConfig = getFirebaseConfig();
  if (firebaseConfig) {
    console.log('Firebase config loaded for project:', firebaseConfig.projectId);
  }

  const app = document.querySelector<HTMLDivElement>('#app')!;
  if (!app) {
    console.error('Could not find #app element');
    return;
  }

  app.innerHTML = '<qti-editor-app></qti-editor-app>';

  console.log('QTI Editor initialized');
});
