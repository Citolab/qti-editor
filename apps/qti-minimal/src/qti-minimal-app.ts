import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@qti-editor/ui/components/toolbar';
import '@qti-editor/ui/components/interaction-insert-menu';
import '@qti-editor/ui/components/attributes-panel';
import '@qti-editor/ui/components/composer-metadata-form';

import { ContextProvider } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { LitElement, html, type PropertyValues } from 'lit';
import { itemContext, itemContextVariables, type ItemContext } from '@qti-editor/prosekit-integration/item-context';
import { xmlFromNode, xmlToHTML } from '@qti-editor/prosekit-integration/save-xml';
import { qtiTestFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-test';
import { blockSelectExtension, nodeAttrsSyncExtension } from '@qti-editor/prosemirror-plugins';
import { createEditor, union, jsonFromHTML, type Editor } from 'prosekit/core';
import { sampleUploader } from '@qti-editor/ui/components/sample/sample-uploader';
import { registerLitEditorTableHandle } from '@qti-editor/ui/components/table-handle';
import { registerLitEditorBlockHandle } from '@qti-editor/ui/components/block-handle';
import { registerLitEditorDropIndicator } from '@qti-editor/ui/components/drop-indicator';
import { editorContext } from '@qti-editor/ui/components/editor-context';

import { defineBasicExtension } from './extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from './extensions/qti-extension.js';

export class QtiMinimalApp extends LitElement {
  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private itemContextProvider: ContextProvider<typeof itemContext>;
  private xmlOutput = '';

  get itemContext(): ItemContext {
    return this.itemContextProvider.value;
  }

  set itemContext(value: ItemContext) {
    this.itemContextProvider.setValue(value);
  }

  private onMetadataChange(event: Event) {
    const detail = (event as CustomEvent<{ title: string; identifier: string }>).detail;
    this.itemContext = {
      ...this.itemContext,
      title: detail.title,
      identifier: detail.identifier
    };
  }

  private saveXml() {
    this.xmlOutput = xmlFromNode(this.editor.view.state.doc);
    this.requestUpdate();
  }

  private saveQti() {
    this.xmlOutput = qtiTestFromProsemirror(this.editor.view.state.doc, {
      identifier: this.itemContext.identifier,
      title: this.itemContext.title
    });
    this.requestUpdate();
  }

  private loadXml() {
    const html = xmlToHTML(this.xmlOutput);
    const json = jsonFromHTML(html, { schema: this.editor.schema });
    this.editor.setContent(json);
  }

  private onTextareaInput(event: Event) {
    this.xmlOutput = (event.target as HTMLTextAreaElement).value;
  }

  constructor() {
    super();

    this.itemContextProvider = new ContextProvider(this, {
      context: itemContext,
      initialValue: { variables: itemContextVariables }
    });

    const extension = union(
      defineBasicExtension(),
      defineQtiInteractionsExtension({
        include: [
          'qti-choice-interaction',
          'qti-extended-text-interaction',
          'qti-text-entry-interaction',
          'qti-item-divider'
        ]
      }),
      blockSelectExtension,
      nodeAttrsSyncExtension
    );

    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();

    new ContextProvider(this, {
      context: editorContext,
      initialValue: this.editor
    });

    registerLitEditorTableHandle();
    registerLitEditorBlockHandle();
    registerLitEditorDropIndicator();
  }

  override createRenderRoot() {
    return this;
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (this.editorRef.value) {
      this.editor.mount(this.editorRef.value);
    }
  }

  override render() {
    return html`
      <div class="min-h-screen pr-96">
        <div class="mx-auto max-w-6xl px-4 py-4">
          <div class="rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm">
            <div class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
              <lit-editor-toolbar .uploader=${sampleUploader}></lit-editor-toolbar>
              <div
                ${ref(this.editorRef)}
                class="min-h-80 w-full px-6 py-6 prose max-w-none!"
                style="padding-left: 2.5rem;"
              ></div>
              <lit-editor-block-handle></lit-editor-block-handle>
              <lit-editor-drop-indicator></lit-editor-drop-indicator>
              <lit-editor-table-handle></lit-editor-table-handle>
            </div>
          </div>

          <div class="flex gap-4 mt-4">
            <qti-composer-metadata-form
              class="block w-1/5"
              .title=${this.itemContext.title ?? ''}
              .identifier=${this.itemContext.identifier ?? ''}
              @metadata-change=${this.onMetadataChange}
            ></qti-composer-metadata-form>

            <div class="mt-4 rounded-md border border-solid border-gray-200 bg-white p-4 shadow-sm flex gap-4">
              <div class="mb-2 gap-2 flex ">
                <button class="btn btn-sm" @click=${this.saveXml}>Save XML</button>
                <button class="btn btn-sm" @click=${this.saveQti}>Save QTI</button>
                <button class="btn btn-sm" @click=${this.loadXml}>Load XML</button>
              </div>
              <textarea
                class="w-full h-48 rounded border border-gray-200 p-2 font-mono text-sm"
                .value=${this.xmlOutput}
                @input=${this.onTextareaInput}
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <qti-attributes-panel
        class="fixed right-0 top-0 bottom-0 w-96 overflow-auto block border-l border-solid border-gray-200 bg-white shadow-sm"
      ></qti-attributes-panel>
    `;
  }
}

customElements.define('qti-minimal-app', QtiMinimalApp);

declare global {
  interface HTMLElementTagNameMap {
    'qti-minimal-app': QtiMinimalApp;
  }
}
