import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@qti-editor/ui/components/composer';
import '@qti-editor/ui/components/composer-metadata-form';
import '@qti-editor/ui/components/attributes-panel';
import '@qti-editor/ui/components/toolbar';
import './components/qti-slash-menu';

import { provide } from '@lit/context';
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
import { qtiFromNode } from '@qti-editor/prosekit-integration';
import { notifyQtiI18nChanged, translateQti } from '@qti-editor/interaction-shared';
import { sampleUploader } from '@qti-editor/ui/components/sample/sample-uploader';

import { defineBasicExtension } from './extensions/basic-extension';
import { defineQtiInteractionsExtension } from './extensions/qti-interactions-extension';
import { defineSlashMenuGuardExtension } from './extensions/slash-menu-guard-extension';

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
      this.requestUpdate();
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('qti:editor:ready', {
          detail: { editor: this.editor },
          bubbles: true,
        }));
      }, 0);
    }
  }

  exportXml(fileName: string = 'item'): void {
    const safeFileName = fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
    const xml = qtiFromNode(this.editor.view.state.doc, {
      identifier: this.itemContext.identifier,
      lang: this.lang,
      title: this.itemContext.title,
    });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  override render() {
    const toolbar = this._editorMounted
      ? html`<lit-editor-toolbar .editor=${this.editor} .uploader=${sampleUploader}></lit-editor-toolbar>`
      : html`<div style="height: 40px;"></div>`;

    return html`
      <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div class="editor-card relative min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90">
            ${toolbar}
          </div>
          <div ${ref(this.editorRef)} class="card h-full min-h-80 flex flex-col bg-white px-6 py-6 dark:bg-slate-900"></div>
          ${this._editorMounted ? html`<qti-slash-menu .editor=${this.editor} style="display: contents;"></qti-slash-menu>` : ''}
          ${this._editorMounted ? html`<qti-composer .editor=${this.editor} class="block w-full shrink-0"></qti-composer>` : ''}
        </div>
        <div class="w-full lg:w-80 lg:shrink-0 lg:max-h-[72vh] lg:overflow-y-auto">
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
