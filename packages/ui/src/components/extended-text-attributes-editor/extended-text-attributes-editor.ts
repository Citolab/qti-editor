import { html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  extendedTextHeightClassOptions,
  parseExtendedTextClassState,
  serializeExtendedTextClassState,
  type ExtendedTextHeightClassOption,
} from '@qti-editor/interactions/extended-text';

import { QTI_ATTRIBUTES_PATCH_EVENT, type QtiAttributesPatchDetail } from '../attributes-panel/patch-event.js';

import type { AttributesNodeDetail } from '@qti-editor/prosemirror-attributes-ui';

const EXTENDED_TEXT_NODE_TYPE = 'qtiextendedtextinteraction';

const heightOptionLabels: Record<ExtendedTextHeightClassOption, string> = {
  'qti-height-lines-3': '3 lines',
  'qti-height-lines-6': '6 lines',
  'qti-height-lines-15': '15 lines',
};

@customElement('qti-extended-text-attributes-editor')
export class QtiExtendedTextAttributesEditor extends LitElement {
  @property({ attribute: false })
  activeNode: AttributesNodeDetail | null = null;

  override createRenderRoot() {
    return this;
  }

  private getActiveExtendedTextNode(): AttributesNodeDetail | null {
    if (!this.activeNode) return null;
    return this.activeNode.type.toLowerCase() === EXTENDED_TEXT_NODE_TYPE ? this.activeNode : null;
  }

  private emitPatch(attrs: Record<string, unknown>) {
    const activeNode = this.getActiveExtendedTextNode();
    if (!activeNode) return;

    const detail: QtiAttributesPatchDetail = {
      pos: activeNode.pos,
      attrs,
    };

    this.dispatchEvent(
      new CustomEvent(QTI_ATTRIBUTES_PATCH_EVENT, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updateHeightClass(heightClass: ExtendedTextHeightClassOption | null) {
    const activeNode = this.getActiveExtendedTextNode();
    if (!activeNode) return;

    const classState = parseExtendedTextClassState(String(activeNode.attrs.class ?? ''));
    const nextClass = serializeExtendedTextClassState({
      ...classState,
      heightClass,
    });
    this.emitPatch({ class: nextClass });
  }

  override render() {
    const activeNode = this.getActiveExtendedTextNode();
    if (!activeNode) return nothing;

    const classState = parseExtendedTextClassState(String(activeNode.attrs.class ?? ''));

    return html`
      <section class="rounded-xl border border-base-300/60 bg-base-100/80 p-3">
        <div class="mb-3">
          <div class="text-sm font-semibold">Extended text</div>
          <div class="text-xs text-base-content/70">
            Configure height.
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <label class="form-control w-full">
            <span class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/70">
              Height preset
            </span>
            <select
              class="select select-sm select-bordered w-full"
              .value=${classState.heightClass ?? ''}
              @change=${(event: Event) => {
                const value = (event.currentTarget as HTMLSelectElement).value as
                  | ExtendedTextHeightClassOption
                  | '';
                this.updateHeightClass(value || null);
              }}
            >
              <option value="">Auto</option>
              ${extendedTextHeightClassOptions.map(
                option =>
                  html`<option value=${option}>${heightOptionLabels[option] ?? option}</option>`,
              )}
            </select>
          </label>
        </div>
      </section>
    `;
  }
}
