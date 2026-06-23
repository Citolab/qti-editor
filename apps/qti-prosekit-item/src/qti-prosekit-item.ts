import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import './components/blocks/toolbar/index.js';
import '@citolab/prose-qti-ui/components/interaction-insert-menu';
import '@citolab/prose-qti-ui/components/attributes-panel';
import './components/blocks/composer-metadata-form/index.js';

import { ContextProvider } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { LitElement, html, type PropertyValues } from 'lit';
import { createEditor, union, jsonFromHTML, type Editor } from 'prosekit/core';
import { itemContext, itemContextVariables, type ItemContext } from '@citolab/prose-qti/integration/item-context';
import { xmlFromNode, xmlToHTML } from '@citolab/prose-qti/integration/save-xml';
import { qtiTestFromProsemirror } from '@citolab/prose-qti/integration/save-qti-test';
import { blockSelectExtension, nodeAttrsSyncExtension } from '@citolab/prose-extensions/prosemirror';
import { editorContext } from '@citolab/prose-qti/integration/editor-context';

import { sampleUploader } from './components/blocks/sample/sample-uploader.js';
import { registerLitEditorTableHandle } from './components/blocks/table-handle/index.js';
import { registerLitEditorBlockHandle } from './components/blocks/block-handle/index.js';
import { registerLitEditorDropIndicator } from './components/blocks/drop-indicator/index.js';
import { registerLitAiChat } from './components/blocks/ai-chat/index.js';
import { registerLitAiCheck } from './components/blocks/ai-check/index.js';
import { registerLitAiCreate } from './components/blocks/ai-create/index.js';
import { registerLitAiStreamContent } from './components/blocks/ai-stream-content/index.js';
import { registerLitEditorInlineMenu } from './components/blocks/inline-menu/index.js';
import { registerLitEditorSlashMenu } from './components/blocks/slash-menu/index.js';
import { defineBasicExtension } from './extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from './extensions/qti-extension.js';
import { defineAiExtension } from './extensions/ai-extension.js';

const CHAT_OPEN_STORAGE_KEY = 'qti-ai-chat-open';

export class QtiProsekitItem extends LitElement {
  static override properties = {
    chatOpen: { state: true },
    settingsOpen: { state: true },
  };

  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private itemContextProvider: ContextProvider<typeof itemContext>;
  private xmlOutput = '';
  private chatOpen = false;
  private settingsOpen = false;

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

  private toggleChat = () => {
    this.chatOpen = !this.chatOpen;
    try {
      window.localStorage.setItem(CHAT_OPEN_STORAGE_KEY, this.chatOpen ? '1' : '0');
    } catch {
      // ignore
    }
  };

  private toggleSettings = () => {
    this.settingsOpen = !this.settingsOpen;
  };

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
          'qti-text-entry-interaction'
        ]
      }),
      blockSelectExtension,
      nodeAttrsSyncExtension,
      defineAiExtension()
    );

    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();

    new ContextProvider(this, {
      context: editorContext,
      initialValue: this.editor
    });

    try {
      this.chatOpen = window.localStorage.getItem(CHAT_OPEN_STORAGE_KEY) === '1';
    } catch {
      // ignore
    }

    registerLitEditorTableHandle();
    registerLitEditorBlockHandle();
    registerLitEditorDropIndicator();
    registerLitAiChat();
    registerLitAiCheck();
    registerLitAiCreate();
    registerLitAiStreamContent();
    registerLitEditorInlineMenu();
    registerLitEditorSlashMenu();

    this.addEventListener('ai-chat-toggle', this.toggleChat);
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
            <lit-editor-toolbar .uploader=${sampleUploader}></lit-editor-toolbar>
            <div class="flex items-center gap-2 px-2 py-1 border-t border-gray-100">
              <span class="flex-1"></span>
              <lit-ai-chat-toolbar .open=${this.chatOpen}></lit-ai-chat-toolbar>
              <button
                type="button"
                @click=${this.toggleSettings}
                class="px-2 py-1 rounded text-sm border border-gray-200 hover:bg-gray-100"
                title="AI settings"
              >
                ⚙
              </button>
            </div>
          </div>
          <div class="relative overflow-auto">
            <div
              ${ref(this.editorRef)}
              class="min-h-80 w-full px-6 py-6 prose max-w-none"
              style="padding-left: 2.5rem;"
            ></div>
            <lit-editor-block-handle></lit-editor-block-handle>
            <lit-editor-drop-indicator></lit-editor-drop-indicator>
            <lit-editor-table-handle></lit-editor-table-handle>
            <lit-ai-check-accept-toolbar></lit-ai-check-accept-toolbar>
            <lit-ai-check-fragment-popover></lit-ai-check-fragment-popover>
            <lit-ai-create-result></lit-ai-create-result>
            <lit-editor-inline-menu></lit-editor-inline-menu>
            <lit-editor-slash-menu></lit-editor-slash-menu>
          </div>
        </div>
        <div class="w-full lg:w-72 lg:shrink-0">
          <qti-attributes-panel .editor=${this.editor} class="block w-full sticky top-0"></qti-attributes-panel>
        </div>
      </div>
      <div class="flex gap-4 mt-4">
        <qti-composer-metadata-form
          class="block w-2/5"
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

      <lit-ai-chat-sidebar .open=${this.chatOpen}></lit-ai-chat-sidebar>

      ${this.settingsOpen
        ? html`
            <div
              class="fixed inset-0 z-40 bg-black/40 flex items-center justify-center"
              @click=${(e: MouseEvent) => {
                if (e.target === e.currentTarget) this.toggleSettings();
              }}
            >
              <div class="bg-white rounded-lg shadow-2xl w-[36rem] max-w-[92vw]">
                <div class="flex items-center px-4 py-2 border-b border-gray-200">
                  <div class="text-sm font-medium flex-1">AI settings & stream-content</div>
                  <button
                    type="button"
                    @click=${this.toggleSettings}
                    class="text-lg leading-none px-2 hover:bg-gray-100 rounded"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <lit-ai-stream-content-toolbar></lit-ai-stream-content-toolbar>
              </div>
            </div>
          `
        : ''}
    `;
  }
}

customElements.define('qti-prosekit-item', QtiProsekitItem);

declare global {
  interface HTMLElementTagNameMap {
    'qti-prosekit-item': QtiProsekitItem;
  }
}
