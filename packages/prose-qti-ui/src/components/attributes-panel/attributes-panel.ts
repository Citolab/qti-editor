import { LitElement, css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { defineUpdateHandler, type Editor } from 'prosekit/core';
import { QtiI18nController } from '@citolab/prose-qti/components/shared/i18n/index.js';
import { translateQti } from '@citolab/prose-qti/components/shared';
import { getNodeAttributePanelMetadataByNodeTypeName } from '@citolab/prose-qti/core/interactions/composer';

import { editorContext } from '../../editor-context/index.js';
import {
  collectSelectionNodesWithSchemaAttrs,
  updateNodeAttrs,
  type AttributesNodeDetail,
} from './attributes-helpers.js';
import { getFriendlyEditor } from './friendly-editor-registry.js';

import type { NodeAttributePanelMetadata } from '@citolab/prose-qti/interfaces';
import type { ChoiceInteractionPanelPresentation } from '../choice-attributes-editor';
import type { QtiAttributesPatchDetail } from './patch-event.js';

type AttrValue = string | number | boolean | string[] | null | undefined;

export type AttributesMetadataResolver = (
  nodeType: string,
  node: AttributesNodeDetail,
) => NodeAttributePanelMetadata | null;

const QTI_CHANGE_EVENT = 'qti:attributes:change';

const defaultQtiMetadataResolver: AttributesMetadataResolver = nodeType => {
  return getNodeAttributePanelMetadataByNodeTypeName(nodeType) ?? null;
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

  /**
   * Split attributes into editable / disabled buckets using only the
   * `editableAttributes` allowlist. No per-field config — anything outside
   * the allowlist is a system attribute and renders disabled. If no
   * allowlist is declared every attribute is editable (matches the
   * prosemirror-app panel behavior).
   */
  private getAttrEntriesByEditability(node: AttributesNodeDetail | null): {
    editable: Array<[string, AttrValue]>;
    readOnly: Array<[string, AttrValue]>;
  } {
    if (!node) return { editable: [], readOnly: [] };
    const entries = Object.entries(node.attrs ?? {}) as Array<[string, AttrValue]>;
    const metadata = this.getPanelMetadata(node);
    if (!metadata?.editableAttributes) return { editable: entries, readOnly: [] };

    const editableSet = new Set(metadata.editableAttributes);
    return {
      editable: entries.filter(([k]) => editableSet.has(k)),
      readOnly: entries.filter(([k]) => !editableSet.has(k)),
    };
  }

  private coerceValue(input: HTMLInputElement, original: AttrValue): AttrValue {
    if (input.type === 'checkbox') return input.checked;
    if (typeof original === 'number') return input.value === '' ? null : Number(input.value);
    return input.value === '' ? null : input.value;
  }

  private handleFieldChange(
    node: AttributesNodeDetail,
    key: string,
    original: AttrValue,
    event: Event,
  ) {
    const input = event.currentTarget as HTMLInputElement;
    this.#updateNodeAttrsByPos(node.pos, { [key]: this.coerceValue(input, original) });
  }

  /**
   * Render an attribute as the appropriate input type, inferred from the
   * value's runtime type: boolean → checkbox, number → number input,
   * anything else → text input. The label is the raw attribute key —
   * richer presentations belong in a friendly editor, not the generic field.
   */
  private renderField(
    node: AttributesNodeDetail,
    key: string,
    value: AttrValue,
    disabled = false,
  ): TemplateResult {
    if (typeof value === 'boolean') {
      return html`
        <label class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">${key}</span>
          <input
            class="checkbox checkbox-sm"
            type="checkbox"
            .checked=${value}
            ?disabled=${disabled}
            @change=${(e: Event) => this.handleFieldChange(node, key, value, e)}
          />
        </label>
      `;
    }
    const inputType = typeof value === 'number' ? 'number' : 'text';
    return html`
      <label class="form-control w-full">
        <span class="mb-1 text-sm font-medium">${key}</span>
        <input
          class="input input-sm input-bordered w-full"
          type=${inputType}
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
          ? editable.map(([k, v]) => this.renderField(node, k, v))
          : html`<p class="text-xs text-base-content/60">${this.i18n.t('attributes.noEditable')}</p>`}
        ${readOnly.length
          ? html`
              <details class="rounded-md border border-base-300/40 bg-base-50 p-2">
                <summary class="cursor-pointer text-xs font-medium">
                  ${this.i18n.t('attributes.readOnlyCount', { count: readOnly.length })}
                </summary>
                <div class="mt-2 flex flex-col gap-2 opacity-80">
                  ${readOnly.map(([k, v]) =>
                    this.renderField(node, k, v, true),
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

export type { ChoiceInteractionPanelPresentation } from '../choice-attributes-editor';

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
