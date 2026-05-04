import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@qti-editor/ui/components/code-panel';
import '@qti-editor/ui/components/composer';
import '@qti-editor/ui/components/composer-metadata-form';
import '@qti-editor/ui/components/attributes-panel';
import '@qti-editor/ui/components/toolbar';
import '@qti-editor/ui/components/items-gutter';
import '@qti-editor/ui/components/items-navigator';
import { registerLitEditorBlockHandle } from '@qti-editor/ui/components/block-handle';
import { registerLitEditorDropIndicator } from '@qti-editor/ui/components/drop-indicator';
import { editorContext } from '@qti-editor/ui/components/editor-context';
import './blocks/slash-menu/index.js';
import { provide, ContextProvider } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { LitElement, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
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
import { qtiEditorEventsExtension } from '@qti-editor/prosekit-integration/events';
import { notifyQtiI18nChanged, translateQti } from '@qti-editor/interaction-shared';

import { defineBasicExtension } from '../extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../extensions/qti-interactions-extension.js';
import { defineSlashMenuGuardExtension } from '../extensions/slash-menu-guard-extension.js';
import { exportXml } from '../lib/exportXml.js';
import { openXmlFilePicker } from '../lib/importXml.js';

const EDITOR_DOC_STORAGE_KEY = 'qti-editor:prosemirror-doc:v1';
const VOID_HTML_TAGS = [
  'img', 'br', 'hr', 'input', 'meta', 'link',
  'source', 'area', 'col', 'embed', 'param', 'track', 'wbr',
];

function toXmlCompatibleFragment(html: string): string {
  const voidTagPattern = new RegExp(`<(${VOID_HTML_TAGS.join('|')})(\\s[^<>]*?)?>`, 'gi');
  return html
    .replace(/&nbsp;/g, '&#160;') // XML doesn't define &nbsp;
    .replace(voidTagPattern, match => {
      if (match.endsWith('/>')) return match;
      return `${match.slice(0, -1)} />`;
    });
}

export class QtiEditorApp extends LitElement {
  @property({ type: String, reflect: true })
  override lang = 'en';

  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private composerEventTarget = new EventTarget();

  // ── Toolbar handoff ─────────────────────────────────────────────────────
  private _editorMounted = false;

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
    lang: 'en',
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
          return translateQti('editor.placeholder', { target: this });
        }
      }),
      defineLocalStorageDocPersistenceExtension({ storageKey: EDITOR_DOC_STORAGE_KEY }),
      blockSelectExtension,
      nodeAttrsSyncExtension,
      qtiEditorEventsExtension({
        emitSelectionChanges: false,
        eventTarget: this.composerEventTarget,
      }),
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

    // Provider for editor context - pass editor directly (ProseKit elements handle unmounted state)
    new ContextProvider(this, {
      context: editorContext,
      initialValue: this.editor,
    });

    // Register block-handle components
    registerLitEditorBlockHandle();
    registerLitEditorDropIndicator();

    this.composerEventTarget.addEventListener('qti:content:change', event => {
      const detail = (event as CustomEvent<{ html?: string }>).detail;
      const xmlCompatibleHtml = toXmlCompatibleFragment(detail?.html ?? '');
      const parsed = new DOMParser().parseFromString(
        '<qti-item-body>' + xmlCompatibleHtml + '</qti-item-body>',
        'application/xml',
      );
      this.itemContext = {
        ...this.itemContext,
        lang: this.itemContext.lang,
        itemBody: parsed,
      };
    });
  }

  override createRenderRoot() {
    return this;
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has('lang')) {
      this.itemContext = {
        ...this.itemContext,
        lang: this.lang,
      };
      notifyQtiI18nChanged();
    }

    if (this.editorRef.value && !this._editorMounted) {
      this.editor.mount(this.editorRef.value);
      this._editorMounted = true;
      this.requestUpdate(); // Re-render to pass editor.view to attributes panel
      // Defer past React's useEffect registration window.
      // updated() runs synchronously during React's DOM commit; useEffect
      // listeners aren't attached until after that commit completes.
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('qti:editor:ready', {
          detail: { editor: this.editor },
          bubbles: true,
        }));
      }, 0);
    }
  }

  exportXml(fileName: string = 'item'): void {
    exportXml({
      node: this.editor.view.state.doc,
      identifier: this.itemContext.identifier,
      lang: this.lang,
      title: this.itemContext.title,
      fileName,
    });
  }

  async importXml(): Promise<void> {
    try {
      const result = await openXmlFilePicker({ schema: this.editor.schema });
      this.editor.setContent(result.json);
      
      // Update metadata if present
      if (result.metadata) {
        this.itemContext = {
          ...this.itemContext,
          ...(result.metadata.title && { title: result.metadata.title }),
          ...(result.metadata.identifier && { identifier: result.metadata.identifier }),
        };
      }
    } catch (error) {
      console.error('Failed to import XML:', error);
      alert('Failed to import XML file. Please check that the file contains valid QTI XML.');
    }
  }

  override render() {
    // Only render components that need the editor after it's mounted
    const editorComponents = this._editorMounted ? html`
      <lit-editor-toolbar .editor=${this.editor} class="block w-full shrink-0" style="padding-left: 1rem; padding-right: 1rem;"></lit-editor-toolbar>
    ` : html`<div class="block w-full shrink-0" style="padding-left: 1rem; padding-right: 1rem; height: 40px;"></div>`;

    return html`
      ${editorComponents}
      <div class="flex flex-1 min-h-0 gap-4 p-4 overflow-hidden">
        <div class="editor-card relative flex min-w-0 flex-1 flex-col rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm overflow-hidden">
          ${this._editorMounted ? html`<qti-items-gutter .editor=${this.editor}></qti-items-gutter>` : ''}
          <div class="relative flex-1 min-h-0 overflow-auto" style="padding-left: 3rem;">
            <div ${ref(this.editorRef)} class="card min-h-full px-6 py-6" style="padding-left: 1rem;"></div>
            <lit-editor-block-handle></lit-editor-block-handle>
            <lit-editor-drop-indicator></lit-editor-drop-indicator>
          </div>
          ${this._editorMounted ? html`<qti-slash-menu .editor=${this.editor} style="display: contents;"></qti-slash-menu>` : ''}
          ${this._editorMounted ? html`<qti-composer .editor=${this.editor} class="block w-full shrink-0" style="position: relative; z-index: 10;"></qti-composer>` : ''}
        </div>
        <div class="w-80 shrink-0 overflow-y-auto">
          <qti-composer-metadata-form
            class="block w-full"
            .title=${this.itemContext.title ?? ''}
            .identifier=${this.itemContext.identifier ?? ''}
            @metadata-change=${this.onMetadataChange}
          ></qti-composer-metadata-form>
          ${this._editorMounted ? html`<qti-attributes-panel
            .editor=${this.editor}
            class="block w-full sticky top-0 mt-5"
          ></qti-attributes-panel>` : ''}
          ${this._editorMounted ? html`<qti-items-navigator
            .editor=${this.editor}
            class="block w-full mt-5"
          ></qti-items-navigator>` : ''}
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
