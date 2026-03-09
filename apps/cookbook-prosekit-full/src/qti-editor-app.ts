import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';

// ProseKit core
import { provide } from '@lit/context';
import { LitElement, PropertyValues, html } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { createEditor, union, type Editor } from 'prosekit/core';
import { defineBasicExtension } from 'prosekit/basic';

// QTI plugins (using ProseKit adapters)
import { qtiEditorEventsExtension } from '@qti-editor/core/events';
import type { QtiAttributesPanel } from './components/editor/attributes';
import { qtiAttributesExtension } from './components/editor/attributes';
import type { QtiCodePanel } from './components/editor/code';
import { qtiCodePanelExtension } from './components/editor/code';
import { defineQtiInteractionsExtension } from '@qti-editor/core/interactions/prosekit';

import { blockSelectExtension } from '@qti-editor/prosemirror-block-select';
import { nodeAttrsSyncExtension } from '@qti-editor/prosemirror-node-attrs-sync';

import { defineToolbarExtension, toolbarInsertMenus } from './components/editor/toolbar';
import { itemContext, itemContextVariables, type ItemContext } from '@qti-editor/core/item-context';
import './components/editor/code/qti-code-panel.js';
import './components/editor/composer/qti-composer.js';
import './components/editor/composer/qti-composer-metadata-form.js';

const VOID_HTML_TAGS = ['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr'];

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
  private panelRef: Ref<QtiAttributesPanel>;
  private codePanelRef: Ref<QtiCodePanel>;
  private attributesEventTarget: EventTarget;
  private editorEventsTarget: EventTarget;
  private codeEventTarget: EventTarget;

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
      qtiAttributesExtension({
        eventTarget: this.attributesEventTarget
      }),
      qtiEditorEventsExtension({
        eventTarget: this.editorEventsTarget
      }),
      qtiCodePanelExtension({
        eventTarget: this.codeEventTarget
      }),
      defineToolbarExtension({
        getEditor: () => this.editor,
        insertMenus: toolbarInsertMenus
      }),
      blockSelectExtension,
      nodeAttrsSyncExtension
    );

    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();
    this.panelRef = createRef<QtiAttributesPanel>();
    this.codePanelRef = createRef<QtiCodePanel>();

    // example: use events from events plugin, probably not even necessary
    this.editorEventsTarget.addEventListener('qti:content:change', event => {
      const detail = (event as CustomEvent<{ html?: string; json?: unknown }>).detail;
      const xmlCompatibleHtml = toXmlCompatibleFragment(detail?.html ?? '');
      const parsed = new DOMParser().parseFromString(
        '<qti-item-body>' + xmlCompatibleHtml + '</qti-item-body>',
        'application/xml'
      );
      this.itemContext = {
        ...this.itemContext,
        itemBody: parsed
      };
    });

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

    if (this.panelRef.value) {
      this.panelRef.value.eventTarget = this.attributesEventTarget;
      (this.panelRef.value as QtiAttributesPanel).editorView = (this.editor as any).view ?? null;
    }

    if (this.codePanelRef.value) {
      this.codePanelRef.value.eventTarget = this.codeEventTarget;
    }
  }

  override render() {
    return html`
      <div class="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div
          class="card min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm overflow-hidden"
        >
          <qti-lit-editor ${ref(this.editorRef)} class="card h-full min-h-80 flex flex-col px-6 py-6"></qti-lit-editor>
          <qti-composer class="block w-full"></qti-composer>
          <qti-code-panel class="block w-full" ${ref(this.codePanelRef)}></qti-code-panel>
        </div>
        <div class="w-full lg:w-80 lg:shrink-0">
          <qti-composer-metadata-form
            class="block w-full"
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
