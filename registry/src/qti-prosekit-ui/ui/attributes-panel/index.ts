import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  choiceInteractionClassGroups,
  parseChoiceInteractionClasses,
  serializeChoiceInteractionClasses,
  type ChoiceInteractionClassGroupId,
  type ChoiceInteractionClassState,
} from '@qti-editor/interaction-choice';
import { getNodeAttributePanelMetadataByNodeTypeName } from '@qti-editor/qti-core/interactions/composer';
import {
  ProsekitAttributesPanel,
  type AttributesFieldMetadata,
  type AttributesFriendlyEditorMetadata,
  type AttributesNodeDetail,
  type AttributesPanelMetadata,
} from '@qti-editor/prosemirror-attributes-ui-prosekit';

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

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends ProsekitAttributesPanel {
  static override styles = [
    ProsekitAttributesPanel.styles,
    css`
      .choice-editor {
        border-radius: 0.75rem;
        border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
        background: color-mix(in srgb, currentColor 2%, white);
        padding: 0.875rem;
      }

      .choice-editor__header {
        margin-bottom: 0.75rem;
      }

      .choice-editor__title {
        font-size: 0.95rem;
        font-weight: 700;
      }

      .choice-editor__description {
        margin-top: 0.2rem;
        font-size: 0.8rem;
        color: color-mix(in srgb, currentColor 55%, transparent);
      }

      .choice-editor__groups {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }

      .choice-editor__group {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .choice-editor__group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .choice-editor__group-title {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: color-mix(in srgb, currentColor 70%, transparent);
      }

      .choice-editor__group-tooltip {
        font-size: 0.75rem;
        color: color-mix(in srgb, currentColor 55%, transparent);
      }

      .choice-editor__options {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .choice-editor__option {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }

      .choice-editor__icon {
        font-size: 0.9em;
        line-height: 1;
      }
    `,
  ];

  @property({ attribute: false })
  public choiceInteractionPresentation: ChoiceInteractionPanelPresentation | null = null;

  constructor() {
    super();
    this.eventName = 'qti:attributes:update';
    this.changeEventName = 'qti:attributes:change';
    this.metadataResolver = (nodeType, node) => {
      const metadata = getNodeAttributePanelMetadataByNodeTypeName(nodeType);
      if (!metadata) return null;

      const fields: Record<string, AttributesFieldMetadata> = {};
      for (const [key, value] of Object.entries(node.attrs ?? {})) {
        fields[key] = {
          label: key,
          input: typeof value === 'number' ? 'number' : undefined,
        };
      }

      return {
        editableAttributes: [...metadata.userEditableAttributes],
        hiddenAttributes: [...(metadata.hiddenRawAttributes ?? [])],
        friendlyEditors: (metadata.friendlyEditors ?? []) as AttributesFriendlyEditorMetadata[],
        fields,
      } satisfies AttributesPanelMetadata;
    };
  }

  protected override renderPanel(): TemplateResult {
    const activeNode = this.activeNode;
    const panelMetadata = this.getPanelMetadata(activeNode);
    const friendlyEditors = panelMetadata?.friendlyEditors ?? [];
    const { editable, readOnly } = this.getAttrEntriesByEditability(activeNode);

    return html`
      <section class="card border border-base-300/50 bg-base-100">
        <div class="card-body gap-3 p-4">
          ${this.renderHeader(activeNode)} ${this.renderNodeSwitcher()}
          <div class="flex flex-col gap-3">
            ${friendlyEditors.map(editor => this.renderFriendlyEditor(editor, activeNode))}
            ${activeNode
              ? html`
                  ${editable.length
                    ? editable.map(([key, value]) =>
                        this.renderField(key, value, this.getFieldMetadata(key, value)),
                      )
                    : friendlyEditors.length
                      ? nothing
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

  private renderFriendlyEditor(
    editor: AttributesFriendlyEditorMetadata,
    activeNode: AttributesNodeDetail | null,
  ): TemplateResult | typeof nothing {
    if (!activeNode) return nothing;

    if (
      editor.kind === 'choiceInteractionClass' &&
      activeNode.type.toLowerCase() === CHOICE_INTERACTION_NODE_TYPE
    ) {
      return this.renderChoiceInteractionClassEditor(activeNode);
    }

    return nothing;
  }

  private renderChoiceInteractionClassEditor(activeNode: AttributesNodeDetail): TemplateResult {
    const classState = parseChoiceInteractionClasses(String(activeNode.attrs.class ?? ''));

    return html`
      <section class="choice-editor">
        <div class="choice-editor__header">
          <div class="choice-editor__title">Choice layout</div>
          <div class="choice-editor__description">
            Configure the QTI class string through grouped controls.
          </div>
        </div>
        <div class="choice-editor__groups">
          ${choiceInteractionClassGroups.map(group => {
            const groupPresentation = this.choiceInteractionPresentation?.groups?.[group.id];
            const selectedValue = this.getSelectedGroupValue(classState, group.id);

            return html`
              <div class="choice-editor__group">
                <div class="choice-editor__group-header">
                  <div class="choice-editor__group-title">${groupPresentation?.title ?? group.title}</div>
                  ${groupPresentation?.tooltip || group.description
                    ? html`
                        <div class="choice-editor__group-tooltip" title=${groupPresentation?.tooltip ?? group.description ?? ''}>
                          ${groupPresentation?.tooltip ?? group.description}
                        </div>
                      `
                    : nothing}
                </div>
                <div class="choice-editor__options">
                  ${group.options.map(option => {
                    const presentation = this.choiceInteractionPresentation?.options?.[option.value];
                    const label = presentation?.label ?? option.label;
                    const title = presentation?.tooltip ?? option.description ?? label;

                    if (group.selection === 'boolean') {
                      return html`
                        <label class="choice-editor__option cursor-pointer" title=${title}>
                          <span class="text-sm font-medium">${label}</span>
                          <input
                            class="toggle toggle-sm"
                            type="checkbox"
                            .checked=${classState.inputControlHidden}
                            @change=${(event: Event) =>
                              this.handleChoiceInteractionToggle(group.id, event)}
                          />
                        </label>
                      `;
                    }

                    return html`
                      <button
                        class="btn btn-sm ${selectedValue === option.value ? 'btn-primary' : 'btn-outline'}"
                        type="button"
                        title=${title}
                        @click=${() => this.handleChoiceInteractionSelection(group.id, option.value)}
                      >
                        ${presentation?.icon
                          ? html`<span class="choice-editor__icon" aria-hidden="true">${presentation.icon}</span>`
                          : nothing}
                        <span>${label}</span>
                      </button>
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

  private getSelectedGroupValue(
    classState: ChoiceInteractionClassState,
    groupId: ChoiceInteractionClassGroupId,
  ): string | null {
    switch (groupId) {
      case 'labels':
        return classState.labels;
      case 'labelsSuffix':
        return classState.labelsSuffix;
      case 'orientation':
        return classState.orientation;
      case 'choicesStacking':
        return classState.choicesStacking;
      case 'inputControlHidden':
        return classState.inputControlHidden ? 'qti-input-control-hidden' : null;
    }
  }

  private handleChoiceInteractionSelection(groupId: ChoiceInteractionClassGroupId, value: string) {
    const activeNode = this.activeNode;
    if (!activeNode) return;

    const currentState = parseChoiceInteractionClasses(String(activeNode.attrs.class ?? ''));
    const nextState: ChoiceInteractionClassState = { ...currentState };

    switch (groupId) {
      case 'labels':
        nextState.labels = value;
        break;
      case 'labelsSuffix':
        nextState.labelsSuffix = value;
        break;
      case 'orientation':
        nextState.orientation = value;
        break;
      case 'choicesStacking':
        nextState.choicesStacking = value;
        break;
      case 'inputControlHidden':
        nextState.inputControlHidden = value === 'qti-input-control-hidden';
        break;
    }

    this.updateActiveNodeAttrs({
      class: serializeChoiceInteractionClasses(nextState),
    });
  }

  private handleChoiceInteractionToggle(groupId: ChoiceInteractionClassGroupId, event: Event) {
    const activeNode = this.activeNode;
    if (!activeNode || groupId !== 'inputControlHidden') return;

    const input = event.currentTarget as HTMLInputElement;
    const currentState = parseChoiceInteractionClasses(String(activeNode.attrs.class ?? ''));

    this.updateActiveNodeAttrs({
      class: serializeChoiceInteractionClasses({
        ...currentState,
        inputControlHidden: input.checked,
      }),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
