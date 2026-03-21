import { LitElement, css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
  updateNodeAttrs,
  type AttributesEventDetail,
  type AttributesNodeDetail,
} from '@qti-editor/prosemirror-attributes';

export type {
  AttributesEventDetail,
  AttributesNodeDetail,
} from '@qti-editor/prosemirror-attributes';

type AttrValue = string | number | boolean | null | undefined;

export type AttributesFieldOption = {
  value: string;
  label: string;
};

export type AttributesFieldMetadata = {
  label?: string;
  input?: 'text' | 'number' | 'checkbox' | 'select';
  options?: AttributesFieldOption[];
  readOnly?: boolean;
};

export type AttributesFriendlyEditorMetadata = {
  attribute: string;
  kind: string;
  config?: unknown;
};

export type AttributesPanelMetadata = {
  editableAttributes?: string[];
  hiddenAttributes?: string[];
  friendlyEditors?: AttributesFriendlyEditorMetadata[];
  fields?: Record<string, AttributesFieldMetadata>;
};

export type AttributesMetadataResolver = (
  nodeType: string,
  node: AttributesNodeDetail,
) => AttributesPanelMetadata | null;

@customElement('pm-attributes-panel')
export class PmAttributesPanel extends LitElement {
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
        border: 1px solid #d1d5db;
        border-radius: 0.75rem;
        padding: 1rem;
        background: white;
      }

      .header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .node-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .node-list button {
        border: 1px solid #d1d5db;
        border-radius: 999px;
        background: #f9fafb;
        padding: 0.25rem 0.625rem;
        font: inherit;
        cursor: pointer;
      }

      .node-list button[data-active='true'] {
        background: #111827;
        color: white;
        border-color: #111827;
      }

      .fields,
      .read-only {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .field-inline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      label,
      summary {
        font-size: 0.875rem;
        font-weight: 600;
      }

      input,
      select {
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        padding: 0.5rem 0.625rem;
        font: inherit;
        background: white;
        color: inherit;
      }

      details {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 0.75rem;
        background: #f9fafb;
      }

      .empty {
        margin: 0;
        color: #6b7280;
        font-size: 0.875rem;
      }
    `,
  ];

  @property({ type: String })
  public eventName = 'pm:attributes:update';

  @property({ type: String })
  public changeEventName = 'pm:attributes:change';

  @property({ attribute: false })
  public eventTarget: EventTarget | null = null;

  @property({ attribute: false })
  public editorView:
    | {
        state: any;
        dispatch: (tr: any) => void;
      }
    | null = null;

  @property({ attribute: false })
  public metadataResolver: AttributesMetadataResolver | null = null;

  @state()
  protected nodes: AttributesNodeDetail[] = [];

  @state()
  protected selectedIndex = 0;

  protected currentEventTarget: EventTarget | null = null;

  protected readonly onUpdateEvent = (event: Event) => {
    const detail = (event as CustomEvent<AttributesEventDetail>).detail;
    const previousSelectedNode = this.activeNode;
    this.nodes = Array.isArray(detail?.nodes) ? detail.nodes : [];

    const preservedIndex =
      previousSelectedNode != null
        ? this.nodes.findIndex(
            node => node.pos === previousSelectedNode.pos && node.type === previousSelectedNode.type,
          )
        : -1;

    if (preservedIndex >= 0) {
      this.selectedIndex = preservedIndex;
    } else if (this.selectedIndex >= this.nodes.length) {
      const requestedNode = detail?.activeNode;
      if (requestedNode) {
        const requestedIndex = this.nodes.findIndex(
          node => node.pos === requestedNode.pos && node.type === requestedNode.type,
        );
        this.selectedIndex = requestedIndex >= 0 ? requestedIndex : 0;
      } else {
        this.selectedIndex = 0;
      }
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    this.currentEventTarget = this.getEventTarget();
    this.currentEventTarget.addEventListener(this.eventName, this.onUpdateEvent as EventListener);
  }

  override disconnectedCallback() {
    if (this.currentEventTarget) {
      this.currentEventTarget.removeEventListener(this.eventName, this.onUpdateEvent as EventListener);
    }
    super.disconnectedCallback();
  }

  protected override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('eventName') || changedProperties.has('eventTarget')) {
      this.updateEventListener();
    }
  }

  protected get activeNode(): AttributesNodeDetail | null {
    if (this.nodes.length === 0) return null;
    if (this.selectedIndex >= this.nodes.length) return this.nodes[0] ?? null;
    return this.nodes[this.selectedIndex] ?? null;
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

  protected setSelectedNode(index: number) {
    this.selectedIndex = index;
  }

  protected getFieldMetadata(key: string, value: AttrValue): AttributesFieldMetadata {
    const metadata = this.getPanelMetadata(this.activeNode);
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
    const hiddenAttributes = new Set(metadata.hiddenAttributes ?? []);

    return {
      editable: entries.filter(([key]) => {
        const field = metadata.fields?.[key];
        return !hiddenAttributes.has(key) && editableAttributes.has(key) && !field?.readOnly;
      }),
      readOnly: entries.filter(([key]) => {
        const field = metadata.fields?.[key];
        return !hiddenAttributes.has(key) && (!editableAttributes.has(key) || Boolean(field?.readOnly));
      }),
    };
  }

  protected getPanelMetadata(node: AttributesNodeDetail | null): AttributesPanelMetadata | null {
    if (!node) return null;
    return this.metadataResolver?.(node.type, node) ?? null;
  }

  protected updateActiveNodeAttrs(attrs: Record<string, AttrValue>) {
    const node = this.activeNode;
    if (!node) return;

    const nextAttrs = { ...node.attrs, ...attrs };
    this.nodes = this.nodes.map((item, idx) => (idx === this.selectedIndex ? { ...item, attrs: nextAttrs } : item));

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

  protected handleFieldChange(attrKey: string, originalValue: AttrValue, event: Event) {
    const input = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    const nextValue = this.coerceValue(input, originalValue);
    this.updateActiveNodeAttrs({ [attrKey]: nextValue });
  }

  protected renderTextField(
    key: string,
    value: AttrValue,
    fieldMetadata: AttributesFieldMetadata,
    disabled = false,
  ): TemplateResult {
    return html`
      <label class="field">
        <span>${fieldMetadata.label ?? key}</span>
        <input
          type=${fieldMetadata.input === 'number' ? 'number' : 'text'}
          .value=${String(value ?? '')}
          ?disabled=${disabled}
          @input=${(event: Event) => this.handleFieldChange(key, value, event)}
        />
      </label>
    `;
  }

  protected renderCheckboxField(
    key: string,
    value: AttrValue,
    fieldMetadata: AttributesFieldMetadata,
    disabled = false,
  ): TemplateResult {
    return html`
      <label class="field-inline">
        <span>${fieldMetadata.label ?? key}</span>
        <input
          type="checkbox"
          .checked=${Boolean(value)}
          ?disabled=${disabled}
          @change=${(event: Event) => this.handleFieldChange(key, value, event)}
        />
      </label>
    `;
  }

  protected renderSelectField(
    key: string,
    value: AttrValue,
    fieldMetadata: AttributesFieldMetadata,
    disabled = false,
  ): TemplateResult {
    return html`
      <label class="field">
        <span>${fieldMetadata.label ?? key}</span>
        <select
          .value=${String(value ?? '')}
          ?disabled=${disabled}
          @change=${(event: Event) => this.handleFieldChange(key, value, event)}
        >
          <option value="">Select…</option>
          ${(fieldMetadata.options ?? []).map(
            option => html`<option value=${option.value}>${option.label}</option>`,
          )}
        </select>
      </label>
    `;
  }

  protected renderField(
    key: string,
    value: AttrValue,
    fieldMetadata: AttributesFieldMetadata,
    disabled = false,
  ): TemplateResult {
    if (fieldMetadata.input === 'checkbox') {
      return this.renderCheckboxField(key, value, fieldMetadata, disabled);
    }

    if (fieldMetadata.input === 'select') {
      return this.renderSelectField(key, value, fieldMetadata, disabled);
    }

    return this.renderTextField(key, value, fieldMetadata, disabled);
  }

  protected renderHeader(activeNode: AttributesNodeDetail | null): TemplateResult {
    return html`
      <header class="header">
        <h3 class="title">Node Attributes</h3>
        <p class="subtitle">${activeNode?.type ?? 'No selection'}</p>
      </header>
    `;
  }

  protected renderNodeSwitcher(): TemplateResult | typeof nothing {
    if (this.nodes.length <= 1) return nothing;

    return html`
      <div class="node-list">
        ${this.nodes.map(
          (node, index) => html`
            <button
              type="button"
              data-active=${String(index === this.selectedIndex)}
              @click=${() => this.setSelectedNode(index)}
            >
              ${node.type}
            </button>
          `,
        )}
      </div>
    `;
  }

  protected renderEmptyState(): TemplateResult {
    return html`<p class="empty">Place the cursor on a node with schema attributes.</p>`;
  }

  protected renderPanel(): TemplateResult {
    const activeNode = this.activeNode;
    const { editable, readOnly } = this.getAttrEntriesByEditability(activeNode);

    return html`
      <div class="panel">
        ${this.renderHeader(activeNode)} ${this.renderNodeSwitcher()}
        ${activeNode
          ? html`
              <div class="fields">
                ${editable.length
                  ? editable.map(([key, value]) =>
                      this.renderField(key, value, this.getFieldMetadata(key, value)),
                    )
                  : html`<p class="empty">No editable attributes.</p>`}
              </div>
              ${readOnly.length
                ? html`
                    <details>
                      <summary>Read-only attributes (${readOnly.length})</summary>
                      <div class="read-only">
                        ${readOnly.map(([key, value]) =>
                          this.renderField(key, value, this.getFieldMetadata(key, value), true),
                        )}
                      </div>
                    </details>
                  `
                : nothing}
            `
          : this.renderEmptyState()}
      </div>
    `;
  }

  override render() {
    return this.renderPanel();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pm-attributes-panel': PmAttributesPanel;
  }
}
