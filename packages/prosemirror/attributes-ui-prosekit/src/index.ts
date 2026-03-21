import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import {
  PmAttributesPanel,
  type AttributesNodeDetail,
} from '@qti-editor/prosemirror-attributes-ui';

export type {
  AttributesEventDetail,
  AttributesFieldMetadata,
  AttributesFriendlyEditorMetadata,
  AttributesMetadataResolver,
  AttributesNodeDetail,
  AttributesPanelMetadata,
} from '@qti-editor/prosemirror-attributes-ui';

@customElement('prosekit-attributes-panel')
export class ProsekitAttributesPanel extends PmAttributesPanel {
  static override styles = [
    PmAttributesPanel.styles,
    css`
      .panel {
        border-color: color-mix(in srgb, currentColor 12%, transparent);
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
      }

      .node-list button {
        border-radius: 0.5rem;
      }

      .node-list button[data-active='true'] {
        background: #2563eb;
        border-color: #2563eb;
      }
    `,
  ];

  override createRenderRoot() {
    return this;
  }

  protected override renderHeader(activeNode: AttributesNodeDetail | null): TemplateResult {
    return html`
      <header class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold">Attributes</h3>
          <p class="text-xs text-base-content/70">${activeNode?.type ?? 'No selection'}</p>
        </div>
      </header>
    `;
  }

  protected override renderNodeSwitcher(): TemplateResult | typeof nothing {
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

  protected override renderTextField(key: string, value: unknown, fieldMetadata: any, disabled = false) {
    return html`
      <label class="form-control w-full">
        <span class="mb-1 text-sm font-medium">${fieldMetadata.label ?? key}</span>
        <input
          class="input input-sm input-bordered w-full"
          type=${fieldMetadata.input === 'number' ? 'number' : 'text'}
          .value=${String(value ?? '')}
          ?disabled=${disabled}
          @input=${(event: Event) => this.handleFieldChange(key, value as any, event)}
        />
      </label>
    `;
  }

  protected override renderCheckboxField(key: string, value: unknown, fieldMetadata: any, disabled = false) {
    return html`
      <label class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">${fieldMetadata.label ?? key}</span>
        <input
          class="checkbox checkbox-sm"
          type="checkbox"
          .checked=${Boolean(value)}
          ?disabled=${disabled}
          @change=${(event: Event) => this.handleFieldChange(key, value as any, event)}
        />
      </label>
    `;
  }

  protected override renderSelectField(key: string, value: unknown, fieldMetadata: any, disabled = false) {
    return html`
      <label class="form-control w-full">
        <span class="mb-1 text-sm font-medium">${fieldMetadata.label ?? key}</span>
        <select
          class="select select-sm select-bordered w-full"
          .value=${String(value ?? '')}
          ?disabled=${disabled}
          @change=${(event: Event) => this.handleFieldChange(key, value as any, event)}
        >
          <option value="">Select…</option>
          ${(fieldMetadata.options ?? []).map(
            (option: { value: string; label: string }) =>
              html`<option value=${option.value}>${option.label}</option>`,
          )}
        </select>
      </label>
    `;
  }

  protected override renderEmptyState(): TemplateResult {
    return html`<p class="text-sm text-base-content/70">Place the cursor on a node with schema attributes.</p>`;
  }

  protected override renderPanel(): TemplateResult {
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
                    : html`<p class="text-sm text-base-content/70">No editable attributes.</p>`}
                  ${readOnly.length
                    ? html`
                        <details class="rounded-lg border border-base-300/50 bg-base-50 p-2">
                          <summary class="cursor-pointer text-sm font-medium">
                            Read-only attributes (${readOnly.length})
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
}

declare global {
  interface HTMLElementTagNameMap {
    'prosekit-attributes-panel': ProsekitAttributesPanel;
  }
}
