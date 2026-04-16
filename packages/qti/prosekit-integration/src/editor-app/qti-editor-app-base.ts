import { provide } from '@lit/context';
import { LitElement, html, type PropertyValues, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { createEditor, union, type Editor, type Extension } from 'prosekit/core';
import { definePlaceholder } from 'prosekit/extensions/placeholder';
import {
  blockSelectExtension,
  defineLocalStorageDocPersistenceExtension,
  defineSemanticPasteExtension,
  nodeAttrsSyncExtension,
  readPersistedStateFromLocalStorage,
} from '@qti-editor/prosemirror';
import { notifyQtiI18nChanged, translateQti } from '@qti-editor/interaction-shared';

import { qtiEditorEventsExtension } from '../events/index.js';
import { itemContext, itemContextVariables, type ItemContext } from '../item-context/index.js';
import { qtiFromNode } from '../save-qti/index.js';

const EDITOR_DOC_STORAGE_KEY = 'qti-editor:prosemirror-doc:v1';
const VOID_HTML_TAGS = [
  'img', 'br', 'hr', 'input', 'meta', 'link',
  'source', 'area', 'col', 'embed', 'param', 'track', 'wbr',
];

function toXmlCompatibleFragment(inputHtml: string): string {
  const voidTagPattern = new RegExp(`<(${VOID_HTML_TAGS.join('|')})(\\s[^<>]*?)?>`, 'gi');
  return inputHtml
    .replace(/&nbsp;/g, '&#160;')
    .replace(voidTagPattern, match => {
      if (match.endsWith('/>')) return match;
      return `${match.slice(0, -1)} />`;
    });
}

export abstract class QtiEditorAppBase extends LitElement {
  @property({ type: String, reflect: true })
  override lang = 'en';

  protected editor: Editor;
  protected editorRef: Ref<HTMLDivElement>;
  protected composerEventTarget = new EventTarget();

  private editorMounted = false;

  @provide({ context: itemContext })
  itemContext: ItemContext = {
    lang: 'en',
    variables: itemContextVariables,
  };

  constructor() {
    super();

    const extension = union(
      this.getAppExtension(),
      defineSemanticPasteExtension(),
      definePlaceholder({
        placeholder: state => {
          const $pos = state.selection.$anchor;
          for (let depth = $pos.depth; depth > 0; depth--) {
            const placeholder = $pos.node(depth).type.spec.placeholder;
            if (placeholder) return placeholder;
          }
          return translateQti('editor.placeholder', { target: this });
        },
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
        defaultContent: restoredState.doc,
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
        `<qti-item-body>${xmlCompatibleHtml}</qti-item-body>`,
        'application/xml',
      );

      this.itemContext = {
        ...this.itemContext,
        lang: this.itemContext.lang,
        itemBody: parsed,
      };
    });
  }

  protected abstract getAppExtension(): Extension<any>;

  protected renderToolbar(): TemplateResult | null {
    return null;
  }

  protected renderEditorSurface(options: {
    cardClass: string;
    contentClass: string;
  }): TemplateResult {
    return html`
      <div class=${options.cardClass}>
        ${this.renderToolbar()}
        <div ${ref(this.editorRef)} class=${options.contentClass}></div>
        <qti-slash-menu .editor=${this.editor} style="display: contents;"></qti-slash-menu>
        <qti-composer .editor=${this.editor} class="block w-full shrink-0"></qti-composer>
      </div>
    `;
  }

  protected renderSidebar(options: {
    containerClass: string;
    attributesClass?: string;
  }): TemplateResult {
    return html`
      <div class=${options.containerClass}>
        <qti-composer-metadata-form
          class="block w-full"
          .title=${this.itemContext.title ?? ''}
          .identifier=${this.itemContext.identifier ?? ''}
          @metadata-change=${this.onMetadataChange}
        ></qti-composer-metadata-form>
        <qti-attributes-panel
          .editor=${this.editor}
          class=${options.attributesClass ?? 'block w-full sticky top-0 mt-5'}
        ></qti-attributes-panel>
      </div>
    `;
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

    if (this.editorRef.value) {
      this.editor.mount(this.editorRef.value);
      if (!this.editorMounted) {
        this.editorMounted = true;
        this.requestUpdate();
        setTimeout(() => {
          this.dispatchEvent(new CustomEvent('qti:editor:ready', {
            detail: { editor: this.editor },
            bubbles: true,
          }));
        }, 0);
      }
    }
  }

  exportXml(fileName = 'item'): void {
    const safeFileName =
      fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
    const xml = qtiFromNode(this.editor.view.state.doc, {
      identifier: this.itemContext.identifier,
      lang: this.lang,
      title: this.itemContext.title,
    });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeFileName}.xml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private onMetadataChange(event: Event) {
    const detail = (event as CustomEvent<{ title: string; identifier: string }>).detail;
    this.itemContext = {
      ...this.itemContext,
      title: detail.title,
      identifier: detail.identifier,
    };
  }
}
