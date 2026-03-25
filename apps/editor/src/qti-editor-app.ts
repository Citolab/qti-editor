import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@qti-editor/ui/components/blocks/code-panel';
import '@qti-editor/ui/components/blocks/composer';
import '@qti-editor/ui/components/blocks/composer-metadata-form';
import '@qti-editor/ui/components/editor/ui/toolbar';
import './components/qti-slash-menu.js';
import '@qti-editor/ui/components/blocks/interaction-insert-menu';
import '@qti-editor/ui/components/blocks/convert-menu';

import { provide } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { LitElement, html, type PropertyValues } from 'lit';
import { itemContext, itemContextVariables, type ItemContext } from '@qti-editor/prosekit-integration/item-context';
import {
  blockSelectExtension,
  defineLocalStorageDocPersistenceExtension,
  defineSemanticPasteExtension,
  nodeAttrsSyncExtension,
  readPersistedStateFromLocalStorage
} from '@qti-editor/prosemirror';
import { createEditor, union, type Editor } from 'prosekit/core';
import { definePlaceholder } from 'prosekit/extensions/placeholder';
import { sampleUploader } from '@qti-editor/ui/components/editor/sample/sample-uploader';

import { defineBasicExtension } from './extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from './extensions/qti-interactions-extension.js';
import { defineSlashMenuGuardExtension } from './extensions/slash-menu-guard-extension.js';

const EDITOR_DOC_STORAGE_KEY = 'qti-editor:prosemirror-doc:v1';

export class QtiEditorApp extends LitElement {
  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;

  private onMetadataChange(event: Event) {
    const detail = (event as CustomEvent<{ title: string; identifier: string }>).detail;
    this.itemContext = {
      ...this.itemContext,
      title: detail.title,
      identifier: detail.identifier
    };
  }

  @provide({ context: itemContext })
  itemContext: ItemContext = {
    variables: itemContextVariables
  };

  constructor() {
    super();

    const extension = union(
      defineBasicExtension(),
      defineQtiInteractionsExtension(),
      defineSemanticPasteExtension(),
      defineSlashMenuGuardExtension(),
      // The placeholder extension is used to mark certain nodes (e.g. interaction content)
      // so the slash menu guard can detect them and suppress the menu when the cursor is inside.
      definePlaceholder({
        placeholder: (state) => {
          const $pos = state.selection.$anchor;
          for (let d = $pos.depth; d > 0; d--) {
            const placeholder = $pos.node(d).type.spec.placeholder;
            if (placeholder) return placeholder;
          }
          return 'Press / for commands...';
        }
      }),
      defineLocalStorageDocPersistenceExtension({ storageKey: EDITOR_DOC_STORAGE_KEY }),
      blockSelectExtension,
      nodeAttrsSyncExtension,
    );

    const restoredState = readPersistedStateFromLocalStorage(EDITOR_DOC_STORAGE_KEY);
    try {
      this.editor = createEditor({
        extension,
        defaultContent: restoredState.doc
      });
    } catch {
      window.localStorage.removeItem(EDITOR_DOC_STORAGE_KEY);
      this.editor = createEditor({ extension });
    }
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
      <div class="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div class="card min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm">
          <div class="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-200">
            <div class="flex gap-2">
              <qti-interaction-insert-menu .editor=${this.editor} class="block"></qti-interaction-insert-menu>
              <qti-convert-menu .editor=${this.editor} class="block"></qti-convert-menu>
            </div>
            <lit-editor-toolbar .editor=${this.editor} .uploader=${sampleUploader}></lit-editor-toolbar>
          </div>
          <div ${ref(this.editorRef)} class="card h-full min-h-80 flex flex-col px-6 py-6"></div>

          <qti-slash-menu .editor=${this.editor} style="display: contents;"></qti-slash-menu>

          <qti-composer .editor=${this.editor} class="block w-full"></qti-composer>
        </div>
        <div class="w-full lg:w-80 lg:shrink-0 lg:h-screen lg:overflow-y-auto">
          <qti-composer-metadata-form
            class="block w-full"
            .title=${this.itemContext.title ?? ''}
            .identifier=${this.itemContext.identifier ?? ''}
            @metadata-change=${this.onMetadataChange}
          >
          </qti-composer-metadata-form>
          <qti-attributes-panel .editor=${this.editor} class="block w-full sticky top-0"></qti-attributes-panel>
        </div>
      </div>
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
