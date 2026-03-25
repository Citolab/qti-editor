import { html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  getPrimaryTextEntryCorrectResponse,
  parseTextEntryCaseSensitiveAttribute,
  parseTextEntryClassState,
  parseTextEntryCorrectResponses,
  parseTextEntryLegacyCorrectResponse,
  serializeTextEntryClassState,
  textEntryWidthClassOptions,
  type TextEntryWidthClassOption,
} from '@qti-editor/interaction-text-entry';

import { QTI_ATTRIBUTES_PATCH_EVENT, type QtiAttributesPatchDetail } from '@qti-editor/ui/components/blocks/attributes-panel/patch-event';

import type { AttributesNodeDetail } from '@qti-editor/prosemirror-attributes-ui-prosekit';

const TEXT_ENTRY_NODE_TYPE = 'qtitextentryinteraction';

const widthOptionLabels: Record<TextEntryWidthClassOption, string> = {
  'qti-input-width-2': '2 chars',
  'qti-input-width-4': '4 chars',
  'qti-input-width-6': '6 chars',
  'qti-input-width-10': '10 chars',
  'qti-input-width-15': '15 chars',
  'qti-input-width-20': '20 chars',
};

@customElement('qti-text-entry-attributes-editor')
export class QtiTextEntryAttributesEditor extends LitElement {
  @property({ attribute: false })
  accessor activeNode: AttributesNodeDetail | null = null;

  override createRenderRoot() {
    return this;
  }

  private getActiveTextEntryNode(): AttributesNodeDetail | null {
    if (!this.activeNode) return null;
    return this.activeNode.type.toLowerCase() === TEXT_ENTRY_NODE_TYPE ? this.activeNode : null;
  }

  private emitPatch(attrs: Record<string, unknown>) {
    const activeNode = this.getActiveTextEntryNode();
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

  private getCorrectResponses(activeNode: AttributesNodeDetail): string[] {
    // Return raw array if already an array - preserve empty strings for editing
    const responses = activeNode.attrs.correctResponses;
    if (Array.isArray(responses)) {
      return responses.map((r: unknown) => String(r ?? ''));
    }

    // Fall back to parsing for legacy/string values
    const parsed = parseTextEntryCorrectResponses(responses);
    if (parsed.length > 0) return parsed;

    const legacy = parseTextEntryLegacyCorrectResponse(activeNode.attrs.correctResponse);
    return legacy ? [legacy] : [];
  }

  private updateWidth(widthClass: TextEntryWidthClassOption | null) {
    const activeNode = this.getActiveTextEntryNode();
    if (!activeNode) return;

    const classState = parseTextEntryClassState(String(activeNode.attrs.class ?? ''));
    const nextClass = serializeTextEntryClassState({
      ...classState,
      widthClass,
    });
    this.emitPatch({ class: nextClass });
  }

  private updateCaseSensitive(caseSensitive: boolean) {
    this.emitPatch({ caseSensitive });
  }

  private updateResponses(nextResponses: string[]) {
    // Don't normalize here - allow empty strings while editing
    // Normalization happens when composing the QTI output
    const primaryCorrectResponse = getPrimaryTextEntryCorrectResponse(nextResponses);

    this.emitPatch({
      correctResponses: nextResponses,
      correctResponse: primaryCorrectResponse,
    });
  }

  override render() {
    const activeNode = this.getActiveTextEntryNode();
    if (!activeNode) return nothing;

    const classState = parseTextEntryClassState(String(activeNode.attrs.class ?? ''));
    const currentResponses = this.getCorrectResponses(activeNode);
    const caseSensitive = parseTextEntryCaseSensitiveAttribute(activeNode.attrs.caseSensitive);

    return html`
      <section class="rounded-xl border border-base-300/60 bg-base-100/80 p-3">
        <div class="mb-3">
          <div class="text-sm font-semibold">Text entry</div>
          <div class="text-xs text-base-content/70">
            Configure width, accepted answers, and case sensitivity.
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <label class="form-control w-full">
            <span class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/70">
              Width preset
            </span>
            <select
              class="select select-sm select-bordered w-full"
              .value=${classState.widthClass ?? ''}
              @change=${(event: Event) => {
                const value = (event.currentTarget as HTMLSelectElement).value as
                  | TextEntryWidthClassOption
                  | '';
                this.updateWidth(value || null);
              }}
            >
              <option value="">Auto</option>
              ${textEntryWidthClassOptions.map(
                option =>
                  html`<option value=${option}>${widthOptionLabels[option] ?? option}</option>`,
              )}
            </select>
          </label>

          <label class="flex items-center justify-between gap-3 rounded-lg border border-base-300/60 p-2">
            <span class="text-sm font-medium">Case sensitive answers</span>
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              .checked=${caseSensitive}
              @change=${(event: Event) =>
                this.updateCaseSensitive((event.currentTarget as HTMLInputElement).checked)}
            />
          </label>

          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold uppercase tracking-wide text-base-content/70">
              Accepted answers
            </div>
            ${currentResponses.length === 0
              ? html`<div class="text-xs text-base-content/60">No accepted answers configured yet.</div>`
              : nothing}
            ${currentResponses.map(
              (response, index) => html`
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    class="input input-sm input-bordered w-full"
                    .value=${response}
                    @input=${(event: Event) => {
                      const nextResponses = [...currentResponses];
                      nextResponses[index] = (event.currentTarget as HTMLInputElement).value;
                      this.updateResponses(nextResponses);
                    }}
                  />
                  <button
                    type="button"
                    class="btn btn-sm btn-ghost"
                    @click=${() => {
                      const nextResponses = currentResponses.filter((_, entryIndex) => entryIndex !== index);
                      this.updateResponses(nextResponses);
                    }}
                  >
                    Remove
                  </button>
                </div>
              `,
            )}
            <button
              type="button"
              class="btn btn-sm btn-outline self-start"
              @click=${() => this.updateResponses([...currentResponses, ''])}
            >
              Add synonym
            </button>
          </div>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-text-entry-attributes-editor': QtiTextEntryAttributesEditor;
  }
}
