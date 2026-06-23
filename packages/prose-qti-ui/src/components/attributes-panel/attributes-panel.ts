import { LitElement, css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { defineUpdateHandler, type Editor } from 'prosekit/core';
import { QtiI18nController } from '@citolab/prose-qti/components/shared/i18n/index.js';
import { translateQti } from '@citolab/prose-qti/components/shared';
import { getNodeAttributePanelMetadataByNodeTypeName } from '@citolab/prose-qti/core/interactions/composer';
import { editorContext } from '@citolab/prose-qti/integration/editor-context';

import {
  collectSelectionNodesWithSchemaAttrs,
  updateNodeAttrs,
  type AttributesNodeDetail,
} from './attributes-helpers.js';
import { getFriendlyEditor } from './friendly-editor-registry.js';

import type {
  AttributeFieldDefinition,
  AttributeFriendlyEditorDefinition,
  NodeAttributePanelMetadata,
} from '@citolab/prose-qti/interfaces';
import type { ChoiceInteractionPanelPresentation } from '../choice-attributes-editor';
import type { QtiAttributesPatchDetail } from './patch-event.js';

type AttrValue = string | number | boolean | string[] | null | undefined;

export type AttributesMetadataResolver = (
  nodeType: string,
  node: AttributesNodeDetail,
) => NodeAttributePanelMetadata | null;

const QTI_CHANGE_EVENT = 'qti:attributes:change';

const defaultQtiMetadataResolver: AttributesMetadataResolver = (nodeType, node) => {
  const metadata = getNodeAttributePanelMetadataByNodeTypeName(nodeType);
  if (!metadata) return null;

  const fields: NodeAttributePanelMetadata['fields'] = {};
  for (const key of Object.keys(node.attrs ?? {})) {
    fields[key] = metadata.fields?.[key] ?? { label: key };
  }

  return {
    nodeTypeName: metadata.nodeTypeName,
    editableAttributes: [...(metadata.editableAttributes ?? [])],
    friendlyEditors: (metadata.friendlyEditors ?? []) as AttributeFriendlyEditorDefinition[],
    fields,
  };
};

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends LitElement {
  static override styles: CSSResultGroup = [
    css`
      :host {
        display: block;
        font: inherit;
        color: inherit;
      }
    `,
  ];

  @property({ attribute: false })
  metadataResolver: AttributesMetadataResolver = defaultQtiMetadataResolver;

  @property({ attribute: false })
  choiceInteractionPresentation: ChoiceInteractionPanelPresentation | null = null;

  @state()
  private nodes: AttributesNodeDetail[] = [];

  @state()
  private isInteracting = false;

  private readonly i18n = new QtiI18nController(this);

  #editor: Editor | null = null;
  #removeUpdateHandler: VoidFunction | null = null;

  #editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
    callback: value => this.#setEditor((value as Editor) ?? null),
  });

  constructor() {
    super();
    void this.#editorConsumer;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('focusin', this.#handleFocusIn);
    this.addEventListener('focusout', this.#handleFocusOut);
  }

  override disconnectedCallback() {
    this.removeEventListener('focusin', this.#handleFocusIn);
    this.removeEventListener('focusout', this.#handleFocusOut);
    this.#removeUpdateHandler?.();
    this.#removeUpdateHandler = null;
    super.disconnectedCallback();
  }

  #setEditor(value: Editor | null) {
    if (this.#editor === value) return;
    this.#removeUpdateHandler?.();
    this.#removeUpdateHandler = null;
    this.#editor = value;
    if (!value) {
      this.nodes = [];
      return;
    }
    this.#removeUpdateHandler = value.use(defineUpdateHandler(() => this.#syncFromEditor()));
    this.#syncFromEditor();
  }

  #syncFromEditor() {
    if (this.isInteracting || !this.#editor) return;
    const view = (this.#editor as any).view;
    if (!view) return;
    this.nodes = collectSelectionNodesWithSchemaAttrs(view.state);
  }

  #handleFocusIn = () => {
    this.isInteracting = true;
  };

  #handleFocusOut = (event: FocusEvent) => {
    const related = event.relatedTarget as HTMLElement | null;
    if (!related || !this.contains(related)) {
      this.isInteracting = false;
      this.#syncFromEditor();
    }
  };

  /**
   * Prevents mousedown from stealing focus and changing editor selection.
   * Only allows focus for interactive elements (inputs, buttons, selects).
   */
  #handlePanelMousedown = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
    if (target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
    event.preventDefault();
  };

  #handleFriendlyEditorPatch = (event: CustomEvent<QtiAttributesPatchDetail>) => {
    event.stopPropagation();
    const detail = event.detail;
    if (!detail) return;
    this.#updateNodeAttrsByPos(detail.pos, detail.attrs as Record<string, AttrValue>);
  };

  #updateNodeAttrsByPos(pos: number, attrs: Record<string, AttrValue>) {
    const index = this.nodes.findIndex(n => n.pos === pos);
    if (index < 0) return;
    const node = this.nodes[index];
    const nextAttrs = { ...node.attrs, ...attrs };
    this.nodes = this.nodes.map((item, i) => (i === index ? { ...item, attrs: nextAttrs } : item));

    this.dispatchEvent(
      new CustomEvent(QTI_CHANGE_EVENT, {
        detail: { node: { ...node, attrs: nextAttrs }, attrs, pos: node.pos },
        bubbles: true,
        composed: true,
      }),
    );

    const view = (this.#editor as any)?.view;
    if (view) updateNodeAttrs(view, node.pos, nextAttrs);
  }

  private getPanelMetadata(node: AttributesNodeDetail | null): NodeAttributePanelMetadata | null {
    return node ? (this.metadataResolver(node.type, node) ?? null) : null;
  }

  private getFieldMetadata(
    node: AttributesNodeDetail,
    key: string,
    value: AttrValue,
  ): AttributeFieldDefinition {
    const metadata = this.getPanelMetadata(node);
    const field = metadata?.fields?.[key] ?? {};
    const input =
      field.input ??
      (field.options?.length
        ? 'select'
        : typeof value === 'boolean'
          ? 'checkbox'
          : typeof value === 'number'
            ? 'number'
            : 'text');
    return { ...field, input };
  }

  private getAttrEntriesByEditability(node: AttributesNodeDetail | null): {
    editable: Array<[string, AttrValue]>;
    readOnly: Array<[string, AttrValue]>;
  } {
    if (!node) return { editable: [], readOnly: [] };
    const entries = Object.entries(node.attrs ?? {}) as Array<[string, AttrValue]>;
    const metadata = this.getPanelMetadata(node);
    if (!metadata) return { editable: entries, readOnly: [] };

    const editableSet = new Set(metadata.editableAttributes ?? entries.map(([k]) => k));
    return {
      editable: entries.filter(([k]) => editableSet.has(k) && !metadata.fields?.[k]?.readOnly),
      readOnly: entries.filter(([k]) => !editableSet.has(k) || metadata.fields?.[k]?.readOnly),
    };
  }

  private coerceValue(
    input: HTMLInputElement | HTMLSelectElement,
    original: AttrValue,
  ): AttrValue {
    if (input instanceof HTMLInputElement && input.type === 'checkbox') return input.checked;
    if (typeof original === 'number') return input.value === '' ? null : Number(input.value);
    return input.value === '' ? null : input.value;
  }

  private handleFieldChange(
    node: AttributesNodeDetail,
    key: string,
    original: AttrValue,
    event: Event,
  ) {
    const input = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    this.#updateNodeAttrsByPos(node.pos, { [key]: this.coerceValue(input, original) });
  }

  private renderField(
    node: AttributesNodeDetail,
    key: string,
    value: AttrValue,
    field: AttributeFieldDefinition,
    disabled = false,
  ): TemplateResult {
    if (field.input === 'checkbox') {
      return html`
        <label class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">${field.label ?? key}</span>
          <input
            class="checkbox checkbox-sm"
            type="checkbox"
            .checked=${Boolean(value)}
            ?disabled=${disabled}
            @change=${(e: Event) => this.handleFieldChange(node, key, value, e)}
          />
        </label>
      `;
    }
    if (field.input === 'select') {
      return html`
        <label class="form-control w-full">
          <span class="mb-1 text-sm font-medium">${field.label ?? key}</span>
          <select
            class="select select-sm select-bordered w-full"
            .value=${String(value ?? '')}
            ?disabled=${disabled}
            @change=${(e: Event) => this.handleFieldChange(node, key, value, e)}
          >
            <option value="">${this.i18n.t('attributes.select')}</option>
            ${(field.options ?? []).map(
              o => html`<option value=${o.value}>${o.label}</option>`,
            )}
          </select>
        </label>
      `;
    }
    return html`
      <label class="form-control w-full">
        <span class="mb-1 text-sm font-medium">${field.label ?? key}</span>
        <input
          class="input input-sm input-bordered w-full"
          type=${field.input === 'number' ? 'number' : 'text'}
          .value=${String(value ?? '')}
          ?disabled=${disabled}
          @input=${(e: Event) => this.handleFieldChange(node, key, value, e)}
        />
      </label>
    `;
  }

  private renderMissingCorrectResponseWarning(
    node: AttributesNodeDetail,
  ): TemplateResult | typeof nothing {
    const attrs = node.attrs ?? {};
    if (!('correctResponse' in attrs)) return nothing;
    const cr = attrs.correctResponse;
    const isEmpty = cr == null || (Array.isArray(cr) ? cr.length === 0 : String(cr).trim().length === 0);
    if (!isEmpty) return nothing;
    return html`
      <div class="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-content">
        <span class="i-lucide-triangle-alert mt-0.5 size-3.5 shrink-0 text-warning"></span>
        <span>${translateQti('attributes.correctResponseMissing', { target: this })}</span>
      </div>
    `;
  }

  /**
   * Per-node section: friendly editors (looked up by kind in the registry)
   * REPLACE the generic field list. Falls through to generic fields when no
   * friendly editor is registered for any of the node's declared kinds.
   */
  private renderNodeSection(node: AttributesNodeDetail): TemplateResult {
    const metadata = this.getPanelMetadata(node);
    const friendlyEditors = metadata?.friendlyEditors ?? [];

    const friendlyTemplates = friendlyEditors
      .map(def => {
        const render = getFriendlyEditor(def.kind);
        return render ? render(node, this) : null;
      })
      .filter((tpl): tpl is TemplateResult => tpl !== null);

    if (friendlyTemplates.length > 0) {
      return html`
        <section
          class="flex flex-col gap-2 rounded-lg border border-base-300/50 bg-base-50/40 p-3"
          data-node-type=${node.type}
        >
          <h4 class="text-xs font-semibold text-base-content/70">${node.type}</h4>
          ${this.renderMissingCorrectResponseWarning(node)} ${friendlyTemplates}
        </section>
      `;
    }

    const { editable, readOnly } = this.getAttrEntriesByEditability(node);
    return html`
      <section
        class="flex flex-col gap-2 rounded-lg border border-base-300/50 bg-base-50/40 p-3"
        data-node-type=${node.type}
      >
        <h4 class="text-xs font-semibold text-base-content/70">${node.type}</h4>
        ${editable.length
          ? editable.map(([k, v]) => this.renderField(node, k, v, this.getFieldMetadata(node, k, v)))
          : html`<p class="text-xs text-base-content/60">${this.i18n.t('attributes.noEditable')}</p>`}
        ${readOnly.length
          ? html`
              <details class="rounded-md border border-base-300/40 bg-base-50 p-2">
                <summary class="cursor-pointer text-xs font-medium">
                  ${this.i18n.t('attributes.readOnlyCount', { count: readOnly.length })}
                </summary>
                <div class="mt-2 flex flex-col gap-2 opacity-80">
                  ${readOnly.map(([k, v]) =>
                    this.renderField(node, k, v, this.getFieldMetadata(node, k, v), true),
                  )}
                </div>
              </details>
            `
          : nothing}
      </section>
    `;
  }

  override render() {
    return html`
      <div
        @qti:attributes:patch=${this.#handleFriendlyEditorPatch}
        @mousedown=${this.#handlePanelMousedown}
      >
        <section class="card border border-base-300/50 bg-base-100">
          <div class="card-body gap-3 p-4">
            <header>
              <h3 class="text-base font-semibold">${this.i18n.t('attributes.heading')}</h3>
            </header>
            ${this.nodes.length === 0
              ? html`<p class="text-sm text-base-content/70">${this.i18n.t('attributes.placeCursor')}</p>`
              : html`<div class="flex flex-col gap-3">${this.nodes.map(n => this.renderNodeSection(n))}</div>`}
          </div>
        </section>
      </div>
    `;
  }
}

export { collectSelectionNodesWithSchemaAttrs, updateNodeAttrs, DOC_POS } from './attributes-helpers.js';
export { registerFriendlyEditor, getFriendlyEditor } from './friendly-editor-registry.js';
export type { FriendlyEditorRenderer } from './friendly-editor-registry.js';
export type { AttributesNodeDetail } from './attributes-helpers.js';
export type { ChoiceInteractionPanelPresentation } from '../choice-attributes-editor';

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
