import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';

import './components/ui/qti-attributes-panel.js';
import './components/ui/qti-code-panel.js';
import './components/ui/qti-composer.js';
import './components/ui/qti-composer-metadata-form.js';

import { provide } from '@lit/context';
import { LitElement, html } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { customElement, property } from 'lit/decorators.js';
import { createEditor, union, type Editor } from 'prosekit/core';
import { defineBasicExtension } from 'prosekit/basic';
import { DOMParser as PMDOMParser } from 'prosekit/pm/model';
import { qtiEditorEventsExtension } from '@qti-editor/core/events';
import { qtiAttributesExtension } from '@qti-editor/core/attributes';
import { qtiCodePanelExtension, type QtiCodeUpdateDetail } from '@qti-editor/core/code';
import { defineQtiInteractionsExtension } from '@qti-editor/core/interactions/prosekit';
import { itemContext, itemContextVariables, type ItemContext } from '@qti-editor/core/item-context';
import { blockSelectExtension } from '@qti-editor/prosemirror-block-select';
import { nodeAttrsSyncExtension } from '@qti-editor/prosemirror-node-attrs-sync';

import { defineToolbarExtension, toolbarInsertMenus } from './components/toolbar/index.js';

import type { PropertyValues} from 'lit';

export interface QtiCocoChangeDetail {
  html: string;
  json: unknown;
  xml: string;
  timestamp: number;
}

const VOID_HTML_TAGS = ['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr'];

function toXmlCompatibleFragment(inputHtml: string): string {
  const voidTagPattern = new RegExp(`<(${VOID_HTML_TAGS.join('|')})(\\s[^<>]*?)?>`, 'gi');
  return inputHtml.replace(voidTagPattern, match => {
    if (match.endsWith('/>')) return match;
    return `${match.slice(0, -1)} />`;
  });
}

@customElement('qti-coco-editor')
export class QtiCocoEditor extends LitElement {
  @property({ type: String })
  value = '';

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: String })
  title = '';

  @property({ type: String })
  identifier = '';

  @provide({ context: itemContext })
  public itemState: ItemContext = {
    variables: itemContextVariables,
  };

  private editor: Editor;
  private editorRef: Ref<HTMLDivElement> = createRef<HTMLDivElement>();
  private panelRef: Ref<any> = createRef<any>();
  private codePanelRef: Ref<any> = createRef<any>();
  private attributesEventTarget = new EventTarget();
  private editorEventsTarget = new EventTarget();
  private codeEventTarget = new EventTarget();
  private valueApplied = false;

  constructor() {
    super();

    const extension = union(
      defineBasicExtension(),
      defineQtiInteractionsExtension(),
      qtiAttributesExtension({ eventTarget: this.attributesEventTarget }),
      qtiEditorEventsExtension({ eventTarget: this.editorEventsTarget }),
      qtiCodePanelExtension({ eventTarget: this.codeEventTarget }),
      defineToolbarExtension({ getEditor: () => this.editor, insertMenus: toolbarInsertMenus }),
      blockSelectExtension,
      nodeAttrsSyncExtension
    );

    this.editor = createEditor({ extension });

    this.editorEventsTarget.addEventListener('qti:content:change', event => {
      const detail = (event as CustomEvent<{ html?: string; json?: unknown }>).detail;
      const xmlCompatibleHtml = toXmlCompatibleFragment(detail?.html ?? '');
      const parsed = new DOMParser().parseFromString(`<qti-item-body>${xmlCompatibleHtml}</qti-item-body>`, 'application/xml');
      this.itemState = {
        ...this.itemState,
        title: this.title,
        identifier: this.identifier,
        itemBody: parsed,
      };
    });

    this.codeEventTarget.addEventListener('qti:code:update', event => {
      const detail = (event as CustomEvent<QtiCodeUpdateDetail>).detail;
      const changeDetail: QtiCocoChangeDetail = {
        html: detail.html,
        json: detail.json,
        xml: detail.xml,
        timestamp: detail.timestamp,
      };
      this.dispatchEvent(
        new CustomEvent<QtiCocoChangeDetail>('qti-coco-change', {
          detail: changeDetail,
          bubbles: true,
          composed: true,
        })
      );
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

    const view = (this.editor as any).view ?? null;
    if (view) {
      view.setProps({ editable: () => !this.readonly });
      if ((!this.valueApplied || changedProperties.has('value')) && this.value.trim()) {
        this.applyHtmlValue(this.value);
        this.valueApplied = true;
      }
    }

    if (changedProperties.has('title') || changedProperties.has('identifier')) {
      this.itemState = {
        ...this.itemState,
        title: this.title,
        identifier: this.identifier,
      };
    }

    if (this.panelRef.value) {
      this.panelRef.value.eventTarget = this.attributesEventTarget;
      this.panelRef.value.editorView = view;
    }

    if (this.codePanelRef.value) {
      this.codePanelRef.value.eventTarget = this.codeEventTarget;
    }
  }

  private applyHtmlValue(value: string) {
    const view = (this.editor as any).view;
    if (!view) return;

    const container = document.createElement('div');
    container.innerHTML = value;
    const doc = PMDOMParser.fromSchema(view.state.schema).parse(container);
    const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
    view.dispatch(tr);
  }

  private onMetadataChange(event: Event) {
    const detail = (event as CustomEvent<{ title: string; identifier: string }>).detail;
    this.title = detail.title;
    this.identifier = detail.identifier;
  }

  override render() {
    return html`
      <div class="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div class="card min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm overflow-hidden">
          <qti-lit-editor ${ref(this.editorRef)} class="card h-full min-h-80 flex flex-col px-6 py-6"></qti-lit-editor>
          <qti-coco-composer class="block w-full"></qti-coco-composer>
          <qti-coco-code-panel class="block w-full" ${ref(this.codePanelRef)}></qti-coco-code-panel>
        </div>
        <div class="w-full lg:w-80 lg:shrink-0">
          <qti-coco-composer-metadata-form
            class="block w-full"
            .title=${this.title}
            .identifier=${this.identifier}
            @metadata-change=${this.onMetadataChange}
          ></qti-coco-composer-metadata-form>
          <qti-coco-attributes-panel ${ref(this.panelRef)}></qti-coco-attributes-panel>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-coco-editor': QtiCocoEditor;
  }

  interface HTMLElementEventMap {
    'qti-coco-change': CustomEvent<QtiCocoChangeDetail>;
  }
}
