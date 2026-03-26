import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@qti-editor/ui/components/blocks/code-panel';
import '@qti-editor/ui/components/blocks/composer';
import '@qti-editor/ui/components/blocks/composer-metadata-form';
import '@qti-editor/ui/components/editor/ui/toolbar';
import './components/qti-slash-menu';
import '@qti-editor/ui/components/blocks/interaction-insert-menu';
import '@qti-editor/ui/components/blocks/convert-menu';

import { LitElement, html, type PropertyValues } from 'lit';
import { provide } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { createEditor, union, type Editor } from 'prosekit/core';
import { definePlaceholder } from 'prosekit/extensions/placeholder';
import { qtiCodePanelExtension } from '@qti-editor/ui/components/blocks/code-panel';
import { qtiAttributesExtension, type QtiAttributesPanel } from '@qti-editor/ui/components/blocks/attributes-panel';
import { qtiEditorEventsExtension } from '@qti-editor/prosekit-integration/events';
import { itemContext, itemContextVariables, type ItemContext } from '@qti-editor/prosekit-integration/item-context';
import {
  blockSelectExtension,
  defineLocalStorageDocPersistenceExtension,
  defineSemanticPasteExtension,
  nodeAttrsSyncExtension,
  readPersistedStateFromLocalStorage
} from '@qti-editor/prosemirror';
import { sampleUploader } from '@qti-editor/ui/components/editor/sample/sample-uploader';

import { defineBasicExtension } from './extensions/basic-extension';
import { defineQtiInteractionsExtension } from './extensions/qti-interactions-extension';
import { defineSlashMenuGuardExtension } from './extensions/slash-menu-guard-extension';

const EDITOR_DOC_STORAGE_KEY = 'qti-editor:prosemirror-doc:v1';

export class QtiEditorApp extends LitElement {
  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private panelRef: Ref<QtiAttributesPanel>;
  private attributesEventTarget: EventTarget;
  private editorEventsTarget: EventTarget;
  private codeEventTarget: EventTarget;

  private _floatPos: { x: number; y: number } | null = null;
  private _floatInitialized = false;
  private _dragOffset = { x: 0, y: 0 };

  private _onHandlePointerDown = (e: PointerEvent) => {
    const handle = e.currentTarget as HTMLElement;
    const toolbar = handle.parentElement!;
    const rect = toolbar.getBoundingClientRect();
    this._dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    handle.setPointerCapture(e.pointerId);
    handle.style.cursor = 'grabbing';
    e.preventDefault();
  };

  private _onHandlePointerMove = (e: PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const cardRect = this.querySelector<HTMLElement>('.editor-card')!.getBoundingClientRect();
    this._floatPos = {
      x: e.clientX - cardRect.left - this._dragOffset.x,
      y: e.clientY - cardRect.top - this._dragOffset.y
    };
    this.requestUpdate();
    e.preventDefault();
  };

  private _onHandlePointerUp = (e: PointerEvent) => {
    const handle = e.currentTarget as HTMLElement;
    handle.releasePointerCapture(e.pointerId);
    handle.style.cursor = 'grab';
  };

  private onMetadataChange(event: Event) {
    const detail = (event as CustomEvent<{ title: string; identifier: string }>).detail;
    this.itemContext = {
      ...this.itemContext,
      title: detail.title,
      identifier: detail.identifier
    };
  }

  @provide({ context: itemContext })
  public itemContext: ItemContext = {
    variables: itemContextVariables
  };

  constructor() {
    super();

    this.attributesEventTarget = new EventTarget();
    this.editorEventsTarget = new EventTarget();
    this.codeEventTarget = new EventTarget();

    // Create the combined extension with QTI support and toolbar
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
      qtiAttributesExtension({ eventTarget: this.attributesEventTarget }),
      qtiEditorEventsExtension({ eventTarget: this.editorEventsTarget }),
      qtiCodePanelExtension({ eventTarget: this.codeEventTarget }),
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
    this.panelRef = createRef<QtiAttributesPanel>();

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

    if (!this._floatInitialized && this.editorRef.value) {
      this._floatInitialized = true;
      requestAnimationFrame(() => {
        if (!this.editorRef.value) return;
        // qti-editor-app is itself a scroll container (overflow-y: auto).
        // getBoundingClientRect() returns viewport coords; for position:fixed we
        // need those same viewport coords — but we must wait one frame so the
        // browser has fully laid out the sticky toolbar and editor pane first.
        const paneRect = this.editorRef.value.getBoundingClientRect();
        const cardRect = this.querySelector<HTMLElement>('.editor-card')!.getBoundingClientRect();
        const toolbar = this.querySelector<HTMLElement>('.float-toolbar');
        const toolbarWidth = toolbar?.offsetWidth ?? 0;
        this._floatPos = {
          x: paneRect.right - toolbarWidth - 12 - cardRect.left,
          y: paneRect.top + 12 - cardRect.top
        };
        this.requestUpdate();
      });
    }

    if (this.panelRef.value) {
      this.panelRef.value.eventTarget = this.attributesEventTarget;
      (this.panelRef.value as QtiAttributesPanel).editorView = (this.editor as any).view ?? null;
    }
  }

  override render() {
    const floatStyle = this._floatPos
      ? `position:absolute;left:${this._floatPos.x}px;top:${this._floatPos.y}px;`
      : `position:absolute;top:12px;right:12px;`;

    const gripIcon = html`<svg width="8" height="20" viewBox="0 0 8 20" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="4"  r="1.4"/><circle cx="6" cy="4"  r="1.4"/>
      <circle cx="2" cy="9"  r="1.4"/><circle cx="6" cy="9"  r="1.4"/>
      <circle cx="2" cy="14" r="1.4"/><circle cx="6" cy="14" r="1.4"/>
      <circle cx="2" cy="19" r="1.4"/><circle cx="6" cy="19" r="1.4"/>
    </svg>`;

    return html`
      <div class="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div class="editor-card relative min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90">
            <lit-editor-toolbar .editor=${this.editor} .uploader=${sampleUploader}></lit-editor-toolbar>
          </div>
          <div
            style=${floatStyle + 'z-index:9999;'}
            class="float-toolbar flex items-stretch rounded-[10px] overflow-hidden select-none
                     bg-white dark:bg-slate-800
                     border border-black/10 dark:border-white/10
                     shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)]
                     dark:shadow-[0_4px_16px_rgba(0,0,0,0.4),0_1px_4px_rgba(0,0,0,0.2)]"
            >
              <div
                title="Drag to reposition"
                class="flex items-center shrink-0 px-1.75 cursor-grab
                       bg-stone-100 dark:bg-slate-700
                       border-r border-black/8 dark:border-white/10
                       text-stone-400 dark:text-slate-500"
                @pointerdown=${this._onHandlePointerDown}
                @pointermove=${this._onHandlePointerMove}
                @pointerup=${this._onHandlePointerUp}
              >${gripIcon}</div>
              <div class="flex items-center gap-0.5 p-1 px-1.5">
                <qti-interaction-insert-menu .editor=${this.editor} class="block"></qti-interaction-insert-menu>
                <qti-convert-menu .editor=${this.editor} class="block"></qti-convert-menu>
              </div>
            </div>
          <div ${ref(this.editorRef)} class="card h-full min-h-80 flex flex-col bg-white px-6 py-6 dark:bg-slate-900"></div>

          <qti-slash-menu .editor=${this.editor} style="display: contents;"></qti-slash-menu>

          <qti-composer .editor=${this.editor} class="block w-full"></qti-composer>
        </div>
        <div class="w-full lg:w-80 lg:shrink-0 lg:max-h-[72vh] lg:overflow-y-auto">
          <qti-composer-metadata-form
            .title=${this.itemContext.title ?? ''}
            .identifier=${this.itemContext.identifier ?? ''}
            @metadata-change=${this.onMetadataChange}
          >
          </qti-composer-metadata-form>
          <qti-attributes-panel ${ref(this.panelRef)}></qti-attributes-panel>
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
