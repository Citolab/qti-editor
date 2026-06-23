import { LitElement, css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { QtiI18nController } from '@citolab/prose-qti/components/shared/i18n/index.js';

import {
  updateNodeAttrs,
  type AttributesEventDetail,
  type AttributesNodeDetail,
} from '../attributes/attributes.js';

import type {
  AttributeFieldDefinition,
  NodeAttributePanelMetadata,
} from '@citolab/prose-qti/interfaces';
import type { EditorState } from 'prosekit/pm/state';

type AttrValue = string | number | boolean | string[] | null | undefined;

export type {
  AttributesEventDetail,
  AttributesNodeDetail,
} from '../attributes/attributes.js';

export type {
  AttributeFieldOption,
  AttributeFieldDefinition,
  AttributeFriendlyEditorDefinition,
  NodeAttributePanelMetadata,
} from '@citolab/prose-qti/interfaces';

export type AttributesMetadataResolver = (
  nodeType: string,
  node: AttributesNodeDetail,
) => NodeAttributePanelMetadata | null;

@customElement('prosekit-attributes-panel')
export class ProsekitAttributesPanel extends LitElement {
  static override styles: CSSResultGroup = [
    css`
      :host {
        display: block;
        font: inherit;
        color: inherit;
      }

      .panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
        border-radius: 0.75rem;
        padding: 1rem;
        background: white;
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
      }

      .empty {
        margin: 0;
        color: #6b7280;
        font-size: 0.875rem;
      }
    `,
  ];

  @property({ type: String })
  eventName = 'pm:attributes:update';

  @property({ type: String })
  changeEventName = 'pm:attributes:change';

  @property({ attribute: false })
  eventTarget: EventTarget | null = null;

  @property({ attribute: false })
  editorView:
    | {
        state: EditorState;
        dispatch: (tr: unknown) => void;
      }
    | null = null;

  @property({ attribute: false })
  metadataResolver: AttributesMetadataResolver | null = null;

  @state()
  nodes: AttributesNodeDetail[] = [];

  /**
   * When true, the panel is being interacted with and should preserve
   * its current state even if the editor selection changes.
   */
  @state()
  isInteracting = false;

  private readonly i18n = new QtiI18nController(this);

  protected currentEventTarget: EventTarget | null = null;

  protected readonly onUpdateEvent = (event: Event) => {
    // Ignore updates while user is interacting with the panel
    // This prevents focus/selection changes from clearing the panel
    if (this.isInteracting) {
      return;
    }

    const detail = (event as CustomEvent<AttributesEventDetail>).detail;
    this.nodes = Array.isArray(detail?.nodes) ? detail.nodes : [];
  };

  override connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(this.eventName, this.onUpdateEvent as EventListener);
    
    // Track focus within the panel to prevent losing selection
    this.addEventListener('focusin', this.handlePanelFocusIn);
    this.addEventListener('focusout', this.handlePanelFocusOut);
  }

  override disconnectedCallback() {
    if (this.currentEventTarget) {
      this.currentEventTarget.removeEventListener(this.eventName, this.onUpdateEvent as EventListener);
    }
    this.removeEventListener('focusin', this.handlePanelFocusIn);
    this.removeEventListener('focusout', this.handlePanelFocusOut);
    super.disconnectedCallback();
  }

  private handlePanelFocusIn = () => {
    this.isInteracting = true;
  };

  private handlePanelFocusOut = (event: FocusEvent) => {
    // Only stop interacting if focus moves outside the panel
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !this.contains(relatedTarget)) {
      this.isInteracting = false;
    }
  };

  protected override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('eventName') || changedProperties.has('eventTarget')) {
      this.updateEventListener();
    }
  }

  override createRenderRoot() {
    return this;
  }

  /** Innermost node in the current ancestor chain, or null when the panel is empty. */
  protected get activeNode(): AttributesNodeDetail | null {
    return this.nodes.length === 0 ? null : (this.nodes[this.nodes.length - 1] ?? null);
  }

  protected getEventTarget(): EventTarget {
    return this.eventTarget ?? document;
  }

  protected updateEventListener() {
    if (!this.isConnected) return;
    const nextTarget = this.getEventTarget();
    if (this.currentEventTarget) {
      this.currentEventTarget.removeEventListener(this.eventName, this.onUpdateEvent as EventListener);
    }
    nextTarget.addEventListener(this.eventName, this.onUpdateEvent as EventListener);
    this.currentEventTarget = nextTarget;
  }

  protected getPanelMetadata(node: AttributesNodeDetail | null): NodeAttributePanelMetadata | null {
    if (!node) return null;
    return this.metadataResolver?.(node.type, node) ?? null;
  }

  protected getFieldMetadata(node: AttributesNodeDetail, key: string, value: AttrValue): AttributeFieldDefinition {
    const metadata = this.getPanelMetadata(node);
    const fieldMetadata = metadata?.fields?.[key] ?? {};
    const inferredInput =
      fieldMetadata.input ??
      (fieldMetadata.options?.length
        ? 'select'
        : typeof value === 'boolean'
          ? 'checkbox'
          : typeof value === 'number'
            ? 'number'
            : 'text');

    return {
      ...fieldMetadata,
      input: inferredInput,
    };
  }

  protected getAttrEntriesByEditability(node: AttributesNodeDetail | null): {
    editable: Array<[string, AttrValue]>;
    readOnly: Array<[string, AttrValue]>;
  } {
    if (!node) return { editable: [], readOnly: [] };

    const attrs = node.attrs ?? {};
    const entries = Object.entries(attrs) as Array<[string, AttrValue]>;
    const metadata = this.getPanelMetadata(node);

    if (!metadata) {
      return { editable: entries, readOnly: [] };
    }

    const editableAttributes = new Set(metadata.editableAttributes ?? entries.map(([key]) => key));

    return {
      editable: entries.filter(([key]) => {
        const field = metadata.fields?.[key];
        return editableAttributes.has(key) && !field?.readOnly;
      }),
      readOnly: entries.filter(([key]) => {
        const field = metadata.fields?.[key];
        return !editableAttributes.has(key) || Boolean(field?.readOnly);
      }),
    };
  }

  protected updateNodeAttrsByPos(pos: number, attrs: Record<string, AttrValue>) {
    const index = this.nodes.findIndex(n => n.pos === pos);
    if (index < 0) return;
    const node = this.nodes[index];

    const nextAttrs = { ...node.attrs, ...attrs };
    this.nodes = this.nodes.map((item, idx) => (idx === index ? { ...item, attrs: nextAttrs } : item));

    this.dispatchEvent(
      new CustomEvent(this.changeEventName, {
        detail: {
          node: { ...node, attrs: nextAttrs },
          attrs,
          pos: node.pos,
        },
        bubbles: true,
        composed: true,
      }),
    );

    if (this.editorView) {
      updateNodeAttrs(this.editorView, node.pos, nextAttrs);
    }
  }

  /** @deprecated Use {@link updateNodeAttrsByPos}. Routes to the innermost node. */
  protected updateActiveNodeAttrs(attrs: Record<string, AttrValue>) {
    const node = this.activeNode;
    if (!node) return;
    this.updateNodeAttrsByPos(node.pos, attrs);
  }

  protected coerceValue(
    input: HTMLInputElement | HTMLSelectElement,
    originalValue: AttrValue,
  ): AttrValue {
    if (input instanceof HTMLInputElement && input.type === 'checkbox') {
      return input.checked;
    }
    if (typeof originalValue === 'number') {
      return input.value === '' ? null : Number(input.value);
    }
    if (input.value === '') return null;
    return input.value;
  }

  protected handleFieldChange(node: AttributesNodeDetail, attrKey: string, originalValue: AttrValue, event: Event) {
    const input = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    const nextValue = this.coerceValue(input, originalValue);
    this.updateNodeAttrsByPos(node.pos, { [attrKey]: nextValue });
  }

  protected renderHeader(): TemplateResult {
    return html`
      <header>
        <h3 class="text-base font-semibold">${this.i18n.t('attributes.heading')}</h3>
      </header>
    `;
  }

  protected renderTextField(
    node: AttributesNodeDetail,
    key: string,
    value: AttrValue,
    fieldMetadata: AttributeFieldDefinition,
    disabled = false,
  ) {
    return html`
      <label class="form-control w-full">
        <span class="mb-1 text-sm font-medium">${fieldMetadata.label ?? key}</span>
        <input
          class="input input-sm input-bordered w-full"
          type=${fieldMetadata.input === 'number' ? 'number' : 'text'}
          .value=${String(value ?? '')}
          ?disabled=${disabled}
          @input=${(event: Event) => this.handleFieldChange(node, key, value, event)}
        />
      </label>
    `;
  }

  protected renderCheckboxField(
    node: AttributesNodeDetail,
    key: string,
    value: AttrValue,
    fieldMetadata: AttributeFieldDefinition,
    disabled = false,
  ) {
    return html`
      <label class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">${fieldMetadata.label ?? key}</span>
        <input
          class="checkbox checkbox-sm"
          type="checkbox"
          .checked=${Boolean(value)}
          ?disabled=${disabled}
          @change=${(event: Event) => this.handleFieldChange(node, key, value, event)}
        />
      </label>
    `;
  }

  protected renderSelectField(
    node: AttributesNodeDetail,
    key: string,
    value: AttrValue,
    fieldMetadata: AttributeFieldDefinition,
    disabled = false,
  ) {
    return html`
      <label class="form-control w-full">
        <span class="mb-1 text-sm font-medium">${fieldMetadata.label ?? key}</span>
        <select
          class="select select-sm select-bordered w-full"
          .value=${String(value ?? '')}
          ?disabled=${disabled}
          @change=${(event: Event) => this.handleFieldChange(node, key, value, event)}
        >
          <option value="">${this.i18n.t('attributes.select')}</option>
          ${(fieldMetadata.options ?? []).map(
            option => html`<option value=${option.value}>${option.label}</option>`,
          )}
        </select>
      </label>
    `;
  }

  protected renderField(
    node: AttributesNodeDetail,
    key: string,
    value: AttrValue,
    fieldMetadata: AttributeFieldDefinition,
    disabled = false,
  ): TemplateResult {
    if (fieldMetadata.input === 'checkbox') {
      return this.renderCheckboxField(node, key, value, fieldMetadata, disabled);
    }
    if (fieldMetadata.input === 'select') {
      return this.renderSelectField(node, key, value, fieldMetadata, disabled);
    }
    return this.renderTextField(node, key, value, fieldMetadata, disabled);
  }

  protected renderEmptyState(): TemplateResult {
    return html`<p class="text-sm text-base-content/70">${this.i18n.t('attributes.placeCursor')}</p>`;
  }

  /**
   * Override hook: render a custom editor for `node` in place of the generic
   * field list. Returning `nothing` falls through to generic rendering. When a
   * custom editor IS returned, it REPLACES the entire generic section for that
   * node (no field list rendered alongside).
   */
  protected renderCustomNodeSection(
    _node: AttributesNodeDetail,
    _metadata: NodeAttributePanelMetadata | null,
  ): TemplateResult | typeof nothing {
    return nothing;
  }

  /** Render one section in the stacked panel — either a custom editor (replace) or generic fields. */
  protected renderNodeSection(node: AttributesNodeDetail): TemplateResult {
    const metadata = this.getPanelMetadata(node);

    const custom = this.renderCustomNodeSection(node, metadata);
    if (custom !== nothing) {
      return html`
        <section class="flex flex-col gap-2 rounded-lg border border-base-300/50 bg-base-50/40 p-3" data-node-type=${node.type}>
          <h4 class="text-xs font-semibold text-base-content/70">${node.type}</h4>
          ${custom}
        </section>
      `;
    }

    const { editable, readOnly } = this.getAttrEntriesByEditability(node);

    return html`
      <section class="flex flex-col gap-2 rounded-lg border border-base-300/50 bg-base-50/40 p-3" data-node-type=${node.type}>
        <h4 class="text-xs font-semibold text-base-content/70">${node.type}</h4>
        ${editable.length
          ? editable.map(([key, value]) => this.renderField(node, key, value, this.getFieldMetadata(node, key, value)))
          : html`<p class="text-xs text-base-content/60">${this.i18n.t('attributes.noEditable')}</p>`}
        ${readOnly.length
          ? html`
              <details class="rounded-md border border-base-300/40 bg-base-50 p-2">
                <summary class="cursor-pointer text-xs font-medium">
                  ${this.i18n.t('attributes.readOnlyCount', { count: readOnly.length })}
                </summary>
                <div class="mt-2 flex flex-col gap-2 opacity-80">
                  ${readOnly.map(([key, value]) =>
                    this.renderField(node, key, value, this.getFieldMetadata(node, key, value), true),
                  )}
                </div>
              </details>
            `
          : nothing}
      </section>
    `;
  }

  protected renderPanel(): TemplateResult {
    return html`
      <section class="card border border-base-300/50 bg-base-100">
        <div class="card-body gap-3 p-4">
          ${this.renderHeader()}
          ${this.nodes.length === 0
            ? this.renderEmptyState()
            : html`<div class="flex flex-col gap-3">${this.nodes.map(node => this.renderNodeSection(node))}</div>`}
        </div>
      </section>
    `;
  }

  override render() {
    return this.renderPanel();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prosekit-attributes-panel': ProsekitAttributesPanel;
  }
}
