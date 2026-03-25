import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@qti-editor/ui/components/editor/ui/toolbar';
import '@qti-editor/ui/components/blocks/interaction-insert-menu';
import '@qti-editor/ui/components/blocks/attributes-panel';
import '@qti-editor/ui/components/blocks/composer-metadata-form';

import { ContextProvider } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { LitElement, html, type PropertyValues } from 'lit';
import { itemContext, itemContextVariables, type ItemContext } from '@qti-editor/prosekit-integration/item-context';
import { xmlFromNode, xmlToHTML } from '@qti-editor/prosekit-integration/save-xml';
import { qtiFromNode } from '@qti-editor/prosekit-integration/save-qti';
import { blockSelectExtension, nodeAttrsSyncExtension } from '@qti-editor/prosemirror';
import { createEditor, union, jsonFromHTML, type Editor } from 'prosekit/core';
import { sampleUploader } from '@qti-editor/ui/components/editor/sample/sample-uploader';

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
      identifier: detail.identifier,
    };
  }

  private saveXml() {
    this.xmlOutput = xmlFromNode(this.editor.view.state.doc);
    this.requestUpdate();
  }

  private saveQti() {
    this.xmlOutput = qtiFromNode(this.editor.view.state.doc, {
      identifier: this.itemContext.identifier,
      title: this.itemContext.title,
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
      initialValue: { variables: itemContextVariables },
    });

    const extension = union(
      defineBasicExtension(),
      defineQtiInteractionsExtension(),
      blockSelectExtension,
      nodeAttrsSyncExtension,
    );

    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();
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
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div class="min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm">
          <div class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
            <qti-interaction-insert-menu .editor=${this.editor} class="block"></qti-interaction-insert-menu>
            <lit-editor-toolbar .editor=${this.editor} .uploader=${sampleUploader}></lit-editor-toolbar>
          </div>
          <div ${ref(this.editorRef)} class="min-h-80 px-6 py-6"></div>
        </div>
        <div class="w-full lg:w-72 lg:shrink-0">
          <qti-composer-metadata-form
            class="block w-full"
            .title=${this.itemContext.title ?? ''}
            .identifier=${this.itemContext.identifier ?? ''}
            @metadata-change=${this.onMetadataChange}
          ></qti-composer-metadata-form>
          <qti-attributes-panel .editor=${this.editor} class="block w-full sticky top-0"></qti-attributes-panel>
        </div>
      </div>
      <div class="mt-4 rounded-md border border-solid border-gray-200 bg-white p-4 shadow-sm">
        <div class="mb-2 flex gap-2">
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
    `;
  }
}

customElements.define('qti-minimal-app', QtiMinimalApp);

declare global {
  interface HTMLElementTagNameMap {
    'qti-minimal-app': QtiMinimalApp;
  }
}
