import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import 'prosemirror-menu/style/menu.css';
import './style.css';

// ProseKit core
import { LitElement, html, type PropertyValues } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { createEditor, union, type Editor } from 'prosekit/core';

// QTI plugins (using ProseKit adapters)
import { qtiEditorEventsExtension } from '@qti-editor/plugin-editor-events';
import {
  QtiAttributesPanel,
  qtiAttributesExtension,
} from '@qti-editor/plugin-qti-attributes';
import {
  QtiCodePanel,
  qtiCodePanelExtension,
} from '@qti-editor/plugin-qti-code';
import { defineQtiExtension } from '@qti-editor/plugin-qti-interactions/prosekit';

// Import toolbar plugin
import { defineToolbarExtension } from '@qti-editor/plugin-toolbar';

class QtiEditorApp extends LitElement {
  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private panelRef: Ref<QtiAttributesPanel>;
  private codePanelRef: Ref<QtiCodePanel>;
  private toolbarRef: Ref<HTMLDivElement>;
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
      qtiAttributesExtension({ eventTarget: this.attributesEventTarget }),
      qtiEditorEventsExtension({ eventTarget: this.editorEventsTarget }),
      qtiCodePanelExtension({ eventTarget: this.codeEventTarget }),
      defineToolbarExtension({
        floating: false,
        mount: () => this.toolbarRef.value,
      }),
    );

    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();
    this.panelRef = createRef<QtiAttributesPanel>();
    this.codePanelRef = createRef<QtiCodePanel>();
    this.toolbarRef = createRef<HTMLDivElement>();

    // example: use events from events plugin, probably not even necessary
    this.editorEventsTarget.addEventListener('qti:content:change', (event) => {
      console.log('qti:content:change', (event as CustomEvent).detail);
    });

    this.editorEventsTarget.addEventListener('qti:selection:change', (event) => {
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
      <main class="app-main">
        <div class="app-toolbar" ${ref(this.toolbarRef)}></div>
        <div class="app-body">
          <div class="editor-host">
            <div class="box-border h-full w-full min-h-36 overflow-y-hidden overflow-x-hidden rounded-md border border-solid border-gray-200 shadow-sm flex flex-col bg-white text-black">
              <div class="relative w-full flex-1 box-border overflow-y-auto">
                <div
                  ${ref(this.editorRef)}
                  class="ProseMirror box-border h-full min-h-full p-8 outline-none"
                ></div>
              </div>
            </div>
          </div>
          <aside class="w-90 max-w-90 shrink-0 p-4">
            <div class="flex flex-col gap-4">
              <qti-attributes-panel ${ref(this.panelRef)}></qti-attributes-panel>
              <qti-code-panel ${ref(this.codePanelRef)}></qti-code-panel>
            </div>
          </aside>
        </div>
      </main>
    `;
  }
}

// Register and initialize
customElements.define('qti-editor-app', QtiEditorApp);

document.addEventListener('DOMContentLoaded', () => {
  console.log('QTI Editor Demo initializing...');

  const app = document.querySelector<HTMLDivElement>('#app')!;
  if (!app) {
    console.error('Could not find #app element');
    return;
  }

  app.innerHTML = '<qti-editor-app></qti-editor-app>';

  console.log('QTI Editor initialized');
});
