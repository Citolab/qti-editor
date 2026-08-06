import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import './components/blocks/toolbar/index.js';
import '@citolab/prose-qti-ui/components/interaction-insert-menu';
import '@citolab/prose-qti-ui/components/attributes-panel';

import { ContextProvider } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { LitElement, html, type PropertyValues } from 'lit';
import { createEditor, union, type Editor } from 'prosekit/core';
import { TextSelection } from 'prosekit/pm/state';
import { itemContext, itemContextVariables, type ItemContext } from '@citolab/prose-qti/integration/item-context';
import { xmlFromNode } from '@citolab/prose-qti/integration/save-xml';
import { qtiItemFromProsemirror } from '@citolab/prose-qti/integration/save-qti-item';
import {
  defaultRoundtripTransforms,
  importItemFromString,
  importItemFromUrl,
} from '@citolab/prose-qti/item-roundtrip';
import { blockSelectExtension, nodeAttrsSyncExtension } from '@citolab/prose-extensions/prosekit-extensions';
import { editorContext } from '@citolab/prose-qti-ui/editor-context';

import { qtiTransformTest } from '@qti-components/transformers';

import { sampleUploader } from './components/blocks/sample/sample-uploader.js';
import { registerLitEditorInlineMenu } from './components/blocks/inline-menu/index.js';
import { registerLitEditorSlashMenu } from './components/blocks/slash-menu/index.js';
import { defineBasicExtension } from './extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from './extensions/qti-extension.js';

const TEST_BASE = '/qti/kennisnet';

interface QtiItemRef {
  href: string;
  identifier: string;
  category: string;
}

function firstTextSelectionPos(doc: Editor['view']['state']['doc']): number | null {
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (found != null) return false;
    if (node.isTextblock && node.content.size > 0) {
      found = pos + 1;
      return false;
    }
    return true;
  });
  return found;
}

async function loadQtiItems(): Promise<QtiItemRef[]> {
  const test = await qtiTransformTest().load(`${TEST_BASE}/AssessmentTest.xml`);
  return test.items().map(item => ({
    href: item.href,
    identifier: item.identifier,
    category: item.category,
  }));
}

export class QtiProsekitItem extends LitElement {
  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private itemContextProvider: ContextProvider<typeof itemContext>;
  private xmlOutput = '';
  private qtiItems: QtiItemRef[] = [];
  private selectedItemHref = '';
  private itemsLoading = false;
  private itemsError = '';
  private itemsInitialized = false;
  private editorMounted = false;
  private mountedEditorElement?: HTMLDivElement;

  get itemContext(): ItemContext {
    return this.itemContextProvider.value;
  }

  set itemContext(value: ItemContext) {
    this.itemContextProvider.setValue(value);
  }

  private saveXml() {
    this.xmlOutput = xmlFromNode(this.editor.view.state.doc);
    this.requestUpdate();
  }

  private saveQti() {
    const doc = this.editor.view.state.doc;
    this.xmlOutput = qtiItemFromProsemirror(doc, {
      identifier: (doc.attrs.identifier as string) ?? '',
      title: (doc.attrs.title as string) ?? '',
    });
    this.requestUpdate();
  }

  private loadXml() {
    const doc = importItemFromString(this.xmlOutput, this.editor.schema, {
      transforms: [...defaultRoundtripTransforms],
    });
    this.editor.setContent(doc.toJSON());
  }

  private onTextareaInput(event: Event) {
    this.xmlOutput = (event.target as HTMLTextAreaElement).value;
  }

  private async loadQtiItems() {
    this.itemsLoading = true;
    this.itemsError = '';
    this.requestUpdate();

    try {
      this.qtiItems = await loadQtiItems();

      if (this.qtiItems.length > 0) {
        this.selectedItemHref = this.qtiItems[0].href;
        await this.openItem(this.selectedItemHref);
      }
    } catch (error) {
      this.itemsError = error instanceof Error ? error.message : String(error);
    } finally {
      this.itemsLoading = false;
      this.requestUpdate();
    }
  }

  private async openItem(href: string) {
    const doc = await importItemFromUrl(href, this.editor.schema, {
      transforms: [...defaultRoundtripTransforms],
    });
    this.editor.setContent(doc.toJSON());

    const state = this.editor.view.state;
    const targetPos = firstTextSelectionPos(state.doc);
    if (targetPos != null) {
      const tr = state.tr.setSelection(TextSelection.create(state.doc, targetPos));
      this.editor.view.dispatch(tr);
    }

    this.xmlOutput = '';
  }

  private handleItemSelect = async (event: Event) => {
    const href = (event.target as HTMLSelectElement).value;
    if (!href || href === this.selectedItemHref) return;

    this.selectedItemHref = href;
    this.itemsError = '';
    this.requestUpdate();

    try {
      await this.openItem(href);
    } catch (error) {
      this.itemsError = error instanceof Error ? error.message : String(error);
      this.requestUpdate();
    }
  };

  constructor() {
    super();

    this.itemContextProvider = new ContextProvider(this, {
      context: itemContext,
      initialValue: { variables: itemContextVariables }
    });

    // Keep AI extensions and UI registrations unwired while ProseKit behavior is
    // brought back in line with the ProseMirror reference editor.
    const extension = union(
      defineBasicExtension(),
      defineQtiInteractionsExtension(),
      blockSelectExtension,
      nodeAttrsSyncExtension
    );

    this.editor = createEditor({ extension });
    this.editorRef = createRef<HTMLDivElement>();

    new ContextProvider(this, {
      context: editorContext,
      initialValue: this.editor
    });

    registerLitEditorInlineMenu();
    registerLitEditorSlashMenu();
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.itemsInitialized) return;
    this.itemsInitialized = true;
    void this.loadQtiItems();
  }

  override disconnectedCallback() {
    this.editor.unmount();
    this.mountedEditorElement = undefined;
    this.editorMounted = false;
    super.disconnectedCallback();
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    const mountElement = this.editorRef.value;
    if (mountElement && mountElement !== this.mountedEditorElement) {
      this.editor.mount(mountElement);
      this.mountedEditorElement = mountElement;
      if (!this.editorMounted) {
        this.editorMounted = true;
        this.requestUpdate();
      }
    }
  }

  override render() {
    return html`
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div class="min-w-0 flex-1 rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm">
          <div class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
            <lit-editor-toolbar .uploader=${sampleUploader}></lit-editor-toolbar>
            <div class="flex items-center gap-2 px-2 py-1 border-t border-gray-100">
              <label class="text-xs font-medium text-gray-600" for="qti-item-select">Item</label>
              ${this.itemsLoading
                ? html`<span class="text-xs text-gray-500">Loading…</span>`
                : html`
                    <select
                      id="qti-item-select"
                      class="max-w-64 rounded border border-gray-200 px-2 py-1 text-sm"
                      .value=${this.selectedItemHref}
                      @change=${this.handleItemSelect}
                    >
                      ${this.qtiItems.map(
                        item => html`<option value=${item.href}>${item.category || item.identifier}</option>`,
                      )}
                    </select>
                  `}
            </div>
            ${this.itemsError
              ? html`<p class="px-2 pb-2 text-xs text-red-700">Failed to load item: ${this.itemsError}</p>`
              : ''}
          </div>
          <div class="relative overflow-auto">
            <div
              ${ref(this.editorRef)}
              class="min-h-80 w-full px-6 py-6 prose max-w-none"
              style="padding-left: 2.5rem;"
            ></div>
            <lit-editor-inline-menu></lit-editor-inline-menu>
            <lit-editor-slash-menu></lit-editor-slash-menu>
          </div>
        </div>
        <div class="w-full lg:w-72 lg:shrink-0">
          ${this.editorMounted
            ? html`<qti-attributes-panel class="block w-full sticky top-0"></qti-attributes-panel>`
            : html`<div class="rounded-md border border-solid border-gray-200 bg-white p-4 text-sm text-gray-600">Loading editor…</div>`}
        </div>
      </div>
      <div class="flex gap-4 mt-4">
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

    `;
  }
}

customElements.define('qti-prosekit-item', QtiProsekitItem);

declare global {
  interface HTMLElementTagNameMap {
    'qti-prosekit-item': QtiProsekitItem;
  }
}
