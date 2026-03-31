import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@qti-editor/ui/components/blocks/code-panel';
import '@qti-editor/ui/components/blocks/composer';
import '@qti-editor/ui/components/blocks/composer-metadata-form';
import '@qti-editor/ui/components/blocks/attributes-panel';
import '@qti-editor/ui/components/editor/ui/toolbar';
import './qti-slash-menu.js';

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
import { qtiEditorEventsExtension } from '@qti-editor/prosekit-integration/events';
import { qtiFromNode } from '@qti-editor/prosekit-integration';

import { defineBasicExtension } from '../extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../extensions/qti-interactions-extension.js';
import { defineSlashMenuGuardExtension } from '../extensions/slash-menu-guard-extension.js';

const EDITOR_DOC_STORAGE_KEY = 'qti-editor:prosemirror-doc:v1';
const VOID_HTML_TAGS = [
  'img', 'br', 'hr', 'input', 'meta', 'link',
  'source', 'area', 'col', 'embed', 'param', 'track', 'wbr',
];

function toXmlCompatibleFragment(html: string): string {
  const voidTagPattern = new RegExp(`<(${VOID_HTML_TAGS.join('|')})(\\s[^<>]*?)?>`, 'gi');
  return html.replace(voidTagPattern, match => {
    if (match.endsWith('/>')) return match;
    return `${match.slice(0, -1)} />`;
  });
}

export class QtiEditorApp extends LitElement {
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
        itemBody: parsed,
      };
    });
  }

  override createRenderRoot() {
    return this;
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (this.editorRef.value) {
      this.editor.mount(this.editorRef.value);
      if (!this._editorMounted) {
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
  }

  exportXml(fileName: string = 'item'): void {
    const safeFileName = fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
    const xml = qtiFromNode(this.editor.view.state.doc, {
      identifier: this.itemContext.identifier,
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
    return html`
      <lit-editor-toolbar .editor=${this.editor} class="block w-full shrink-0" style="padding-left: 1rem; padding-right: 1rem;"></lit-editor-toolbar>
      <div class="flex flex-1 min-h-0 gap-4 p-4 overflow-hidden">
        <div class="editor-card relative flex min-w-0 flex-1 flex-col rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm overflow-hidden">
          <div ${ref(this.editorRef)} class="card flex-1 min-h-0 px-6 py-6 overflow-auto"></div>
          <qti-slash-menu .editor=${this.editor} style="display: contents;"></qti-slash-menu>
          <qti-composer .editor=${this.editor} class="block w-full shrink-0"></qti-composer>
        </div>
        <div class="w-80 shrink-0 overflow-y-auto">
          <qti-composer-metadata-form
            class="block w-full"
            .title=${this.itemContext.title ?? ''}
            .identifier=${this.itemContext.identifier ?? ''}
            @metadata-change=${this.onMetadataChange}
          ></qti-composer-metadata-form>
          <qti-attributes-panel
            .editor=${this.editor}
            class="block w-full sticky top-0 mt-5"
          ></qti-attributes-panel>
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
