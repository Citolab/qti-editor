import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  choiceInteractionClassGroups,
  parseChoiceInteractionClasses,
  serializeChoiceInteractionClasses,
  type ChoiceInteractionClassGroupId,
  type ChoiceInteractionClassState,
} from '@qti-editor/interaction-choice';

import { QTI_ATTRIBUTES_PATCH_EVENT, type QtiAttributesPatchDetail } from '@qti-editor/ui/components/blocks/attributes-panel/patch-event';

import type { AttributesNodeDetail } from '@qti-editor/prosemirror-attributes-ui-prosekit';

type ChoiceInteractionOptionPresentation = {
  label?: string;
  tooltip?: string;
  icon?: string;
};

type ChoiceInteractionGroupPresentation = {
  title?: string;
  tooltip?: string;
};

export interface ChoiceInteractionPanelPresentation {
  groups?: Partial<Record<ChoiceInteractionClassGroupId, ChoiceInteractionGroupPresentation>>;
  options?: Partial<Record<string, ChoiceInteractionOptionPresentation>>;
}

const CHOICE_INTERACTION_NODE_TYPE = 'qtichoiceinteraction';

@customElement('qti-choice-attributes-editor')
export class QtiChoiceAttributesEditor extends LitElement {
  @property({ attribute: false })
  activeNode: AttributesNodeDetail | null = null;

  @property({ attribute: false })
  presentation: ChoiceInteractionPanelPresentation | null = null;

  override createRenderRoot() {
    return this;
  }

  private getActiveChoiceNode(): AttributesNodeDetail | null {
    if (!this.activeNode) return null;
    return this.activeNode.type.toLowerCase() === CHOICE_INTERACTION_NODE_TYPE ? this.activeNode : null;
  }

  private emitPatch(attrs: Record<string, unknown>) {
    const activeNode = this.getActiveChoiceNode();
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

  private getSelectedGroupValue(
    classState: ChoiceInteractionClassState,
    groupId: ChoiceInteractionClassGroupId,
  ): string | null {
    if (groupId === 'inputControlHidden') {
      return classState.inputControlHidden ? 'qti-input-control-hidden' : null;
    }

    return classState[groupId];
  }

  private updateChoiceInteractionClass(
    classState: ChoiceInteractionClassState,
    groupId: ChoiceInteractionClassGroupId,
    className: string,
  ) {
    const nextState = {
      ...classState,
      [groupId]: className,
    } as ChoiceInteractionClassState;

    const nextClassValue = serializeChoiceInteractionClasses(nextState);
    this.emitPatch({ class: nextClassValue });
  }

  private updateChoiceInteractionBoolean(
    classState: ChoiceInteractionClassState,
    groupId: ChoiceInteractionClassGroupId,
    checked: boolean,
  ) {
    const nextState = {
      ...classState,
      [groupId]: checked,
    } as ChoiceInteractionClassState;

    const nextClassValue = serializeChoiceInteractionClasses(nextState);
    this.emitPatch({ class: nextClassValue });
  }

  private renderChoiceInteractionBooleanOption(
    classState: ChoiceInteractionClassState,
    groupId: ChoiceInteractionClassGroupId,
    option: ChoiceInteractionClassState['inputControlHidden'] extends boolean
      ? { value: string; label: string; description?: string }
      : never,
  ): TemplateResult {
    const optionPresentation = this.presentation?.options?.[option.value];

    return html`
      <label class="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          .checked=${classState.inputControlHidden}
          @change=${(event: Event) =>
            this.updateChoiceInteractionBoolean(
              classState,
              groupId,
              (event.target as HTMLInputElement).checked,
            )}
        />
        <span aria-hidden="true">${optionPresentation?.icon ?? nothing}</span>
        <span title=${optionPresentation?.tooltip ?? option.description ?? ''}>
          ${optionPresentation?.label ?? option.label}
        </span>
      </label>
    `;
  }

  override render() {
    const activeNode = this.getActiveChoiceNode();
    if (!activeNode) return nothing;

    const classState = parseChoiceInteractionClasses(String(activeNode.attrs.class ?? ''));

    return html`
      <section class="rounded-xl border border-base-300/60 bg-base-100/80 p-3">
        <div class="mb-3">
          <div class="text-sm font-semibold">Choice layout</div>
          <div class="text-xs text-base-content/70">
            Configure the interaction class string with grouped controls.
          </div>
        </div>
        <div class="flex flex-col gap-4">
          ${choiceInteractionClassGroups.map(group => {
            const groupPresentation = this.presentation?.groups?.[group.id];
            const selectedValue = this.getSelectedGroupValue(classState, group.id);

            return html`
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-base-content/70">
                    ${groupPresentation?.title ?? group.title}
                  </div>
                  ${groupPresentation?.tooltip
                    ? html`<div class="text-xs text-base-content/60">${groupPresentation.tooltip}</div>`
                    : nothing}
                </div>
                <div class="flex flex-wrap gap-2">
                  ${group.selection === 'boolean'
                    ? this.renderChoiceInteractionBooleanOption(classState, group.id, group.options[0])
                    : group.options.map(option => {
                        const optionPresentation = this.presentation?.options?.[option.value];

                        return html`
                          <label class="inline-flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name=${group.id}
                              class="radio radio-sm"
                              .value=${option.value}
                              .checked=${selectedValue === option.value}
                              @change=${() =>
                                this.updateChoiceInteractionClass(classState, group.id, option.value)}
                            />
                            <span aria-hidden="true">${optionPresentation?.icon ?? nothing}</span>
                            <span title=${optionPresentation?.tooltip ?? option.description ?? ''}>
                              ${optionPresentation?.label ?? option.label}
                            </span>
                          </label>
                        `;
                      })}
                </div>
              </div>
            `;
          })}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-choice-attributes-editor': QtiChoiceAttributesEditor;
  }
}
