import { LitElement, css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { QtiI18nController } from '@qti-editor/interaction-shared/i18n/index.js';
import {
  updateNodeAttrs,
  type AttributesEventDetail,
  type AttributesNodeDetail,
} from '@qti-editor/prosemirror-attributes';

import type {
  AttributeFieldDefinition,
  NodeAttributePanelMetadata,
} from '@qti-editor/interfaces';
import type { EditorState } from 'prosekit/pm/state';

type AttrValue = string | number | boolean | string[] | null | undefined;

export type {
  AttributesEventDetail,
  AttributesNodeDetail,
} from '@qti-editor/prosemirror-attributes';

export type {
  AttributeFieldOption,
  AttributeFieldDefinition,
  AttributeFriendlyEditorDefinition,
  NodeAttributePanelMetadata,
} from '@qti-editor/interfaces';

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

  @state()
  selectedIndex = 0;

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

  protected getPanelMetadata(node: AttributesNodeDetail | null): NodeAttributePanelMetadata | null {
    if (!node) return null;
    return this.metadataResolver?.(node.type, node) ?? null;
  }

  protected getFieldMetadata(key: string, value: AttrValue): AttributeFieldDefinition {
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

  protected updateActiveNodeAttrs(attrs: Record<string, AttrValue>) {
    const node = this.activeNode;
    if (!node) return;

    const nextAttrs = { ...node.attrs, ...attrs };
    this.nodes = this.nodes.map((item, idx) =>
      idx === this.selectedIndex ? { ...item, attrs: nextAttrs } : item,
    );

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

  protected renderHeader(activeNode: AttributesNodeDetail | null): TemplateResult {
    return html`
      <header class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold">${this.i18n.t('attributes.heading')}</h3>
          <p class="text-xs text-base-content/70">${activeNode?.type ?? this.i18n.t('attributes.noSelection')}</p>
        </div>
      </header>
    `;
  }

  protected renderNodeSwitcher(): TemplateResult | typeof nothing {
    if (this.nodes.length <= 1) return nothing;

    return html`
      <div class="flex flex-wrap gap-2">
        ${this.nodes.map(
          (node, index) => html`
            <button
              class="btn btn-xs ${index === this.selectedIndex ? 'btn-primary' : 'btn-ghost'}"
              type="button"
              @click=${() => this.setSelectedNode(index)}
            >
              ${node.type}
            </button>
          `,
        )}
      </div>
    `;
  }

  protected renderTextField(
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
          @input=${(event: Event) => this.handleFieldChange(key, value, event)}
        />
      </label>
    `;
  }

  protected renderCheckboxField(
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
          @change=${(event: Event) => this.handleFieldChange(key, value, event)}
        />
      </label>
    `;
  }

  protected renderSelectField(
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
          @change=${(event: Event) => this.handleFieldChange(key, value, event)}
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
    key: string,
    value: AttrValue,
    fieldMetadata: AttributeFieldDefinition,
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

  protected renderEmptyState(): TemplateResult {
    return html`<p class="text-sm text-base-content/70">${this.i18n.t('attributes.placeCursor')}</p>`;
  }

  protected renderPanel(): TemplateResult {
    const activeNode = this.activeNode;
    const { editable, readOnly } = this.getAttrEntriesByEditability(activeNode);

    return html`
      <section class="card border border-base-300/50 bg-base-100">
        <div class="card-body gap-3 p-4">
          ${this.renderHeader(activeNode)} ${this.renderNodeSwitcher()}
          <div class="flex flex-col gap-3">
            ${activeNode
              ? html`
                  ${editable.length
                    ? editable.map(([key, value]) =>
                        this.renderField(key, value, this.getFieldMetadata(key, value)),
                      )
                    : html`<p class="text-sm text-base-content/70">${this.i18n.t('attributes.noEditable')}</p>`}
                  ${readOnly.length
                    ? html`
                        <details class="rounded-lg border border-base-300/50 bg-base-50 p-2">
                          <summary class="cursor-pointer text-sm font-medium">
                            ${this.i18n.t('attributes.readOnlyCount', { count: readOnly.length })}
                          </summary>
                          <div class="mt-3 flex flex-col gap-3 opacity-80">
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
