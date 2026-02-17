import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';

// ProseKit core
import { provide } from '@lit/context';
import {
  EMPTY_QTI_ATTRIBUTES_DETAIL,
  qtiEditorContext,
  type QtiEditorContextValue
} from '@qti-editor/plugin-editor-context';
import { LitElement, PropertyValues, html } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { createEditor, union, type Editor } from 'prosekit/core';

// QTI plugins (using ProseKit adapters)
import { qtiEditorEventsExtension } from '@qti-editor/plugin-editor-events';
import type { QtiAttributesPanel } from '@qti-editor/plugin-qti-attributes';
import { qtiAttributesExtension } from '@qti-editor/plugin-qti-attributes';
import type { QtiCodePanel } from '@qti-editor/plugin-qti-code';
import { qtiCodePanelExtension } from '@qti-editor/plugin-qti-code';
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

  @provide({ context: qtiEditorContext })
  private editorPanelContext: QtiEditorContextValue;

  constructor() {
    super();

    this.attributesEventTarget = new EventTarget();
    this.editorEventsTarget = new EventTarget();
    this.codeEventTarget = new EventTarget();
    this.editorPanelContext = {
      attributes: EMPTY_QTI_ATTRIBUTES_DETAIL,
      code: null,
      editorView: null
    };

    // Create the combined extension with QTI support and toolbar
    const extension = union(
      defineQtiExtension(),
      qtiAttributesExtension({
        eventTarget: this.attributesEventTarget
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
      <div class="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div
          class="card min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm overflow-hidden"
        >
          <qti-lit-editor
            ${ref(this.editorRef)}
            class="card h-full min-h-80 flex flex-col px-6 py-6"
          ></qti-lit-editor>
        </div>
        <div class="w-full lg:w-80 lg:shrink-0">
          <qti-attributes-panel ${ref(this.panelRef)}></qti-attributes-panel>
        </div>
      </div>
      <qti-code-panel class="mt-10 w-full" ${ref(this.codePanelRef)}></qti-code-panel>
    `;
  }
}

// Register and initialize
customElements.define('qti-editor-app', QtiEditorApp);

declare global {
  interface HTMLElementTagNameMap {
    'qti-editor-app': QtiEditorApp;
  }
}
