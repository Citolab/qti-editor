import { html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import {
  QTI_RUBRIC_BLOCK_USE_VALUES,
  QTI_RUBRIC_BLOCK_VIEW_VALUES,
} from '@citolab/prose-qti/components/rubric-block';

import { QTI_ATTRIBUTES_PATCH_EVENT, type QtiAttributesPatchDetail } from '../attributes-panel/patch-event.js';

import type { AttributesNodeDetail } from '../attributes-panel/attributes-helpers.js';

const RUBRIC_BLOCK_NODE_TYPE = 'qtirubricblock';

@customElement('qti-rubric-block-attributes-editor')
export class QtiRubricBlockAttributesEditor extends LitElement {
  @property({ attribute: false })
  activeNode: AttributesNodeDetail | null = null;

  override createRenderRoot() {
    return this;
  }

  private getActiveNode(): AttributesNodeDetail | null {
    if (!this.activeNode) return null;
    return this.activeNode.type.toLowerCase() === RUBRIC_BLOCK_NODE_TYPE ? this.activeNode : null;
  }

  private emitPatch(attrs: Record<string, unknown>) {
    const node = this.getActiveNode();
    if (!node) return;
    const detail: QtiAttributesPatchDetail = { pos: node.pos, attrs };
    this.dispatchEvent(
      new CustomEvent(QTI_ATTRIBUTES_PATCH_EVENT, { detail, bubbles: true, composed: true }),
    );
  }

  override render() {
    const node = this.getActiveNode();
    if (!node) return nothing;

    const use = String(node.attrs.use ?? '');
    const view = String(node.attrs.view ?? '');

    return html`
      <section class="rounded-xl border border-base-300/60 bg-base-100/80 p-3">
        <div class="mb-3">
          <div class="text-sm font-semibold">Rubric block</div>
          <div class="text-xs text-base-content/70">Configure use + view.</div>
        </div>
        <div class="flex flex-col gap-3">
          <label class="form-control w-full">
            <span class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/70">use</span>
            <select
              class="select select-sm select-bordered w-full"
              .value=${use}
              @change=${(e: Event) => this.emitPatch({ use: (e.currentTarget as HTMLSelectElement).value })}
            >
              <option value="">(none)</option>
              ${QTI_RUBRIC_BLOCK_USE_VALUES.map(v => html`<option value=${v}>${v}</option>`)}
            </select>
          </label>
          <label class="form-control w-full">
            <span class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/70">view</span>
            <select
              class="select select-sm select-bordered w-full"
              .value=${view}
              @change=${(e: Event) => this.emitPatch({ view: (e.currentTarget as HTMLSelectElement).value })}
            >
              <option value="">(none)</option>
              ${QTI_RUBRIC_BLOCK_VIEW_VALUES.map(v => html`<option value=${v}>${v}</option>`)}
            </select>
          </label>
        </div>
      </section>
    `;
  }
}
