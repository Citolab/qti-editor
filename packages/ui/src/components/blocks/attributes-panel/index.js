var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { union } from 'prosekit/core';
import { choiceInteractionClassGroups, parseChoiceInteractionClasses, serializeChoiceInteractionClasses, } from '@qti-editor/interaction-choice';
import { getNodeAttributePanelMetadataByNodeTypeName } from '@qti-editor/qti-core/interactions/composer';
import { qtiAttributesExtension, qtiSidePanelExtension, updateQtiNodeAttrs, } from '@qti-editor/core/attributes';
import { ProsekitAttributesPanel, } from '@qti-editor/prosemirror-attributes-ui-prosekit';
const CHOICE_INTERACTION_NODE_TYPE = 'qtichoiceinteraction';
let QtiAttributesPanel = class QtiAttributesPanel extends ProsekitAttributesPanel {
    constructor() {
        super();
        Object.defineProperty(this, "choiceInteractionPresentation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.eventName = 'qti:attributes:update';
        this.changeEventName = 'qti:attributes:change';
        this.metadataResolver = (nodeType, node) => {
            const metadata = getNodeAttributePanelMetadataByNodeTypeName(nodeType);
            if (!metadata)
                return null;
            const fields = {};
            for (const key of Object.keys(node.attrs ?? {})) {
                fields[key] = { label: key };
            }
            const panelMetadata = {
                editableAttributes: [...metadata.userEditableAttributes],
                hiddenAttributes: [...(metadata.hiddenRawAttributes ?? [])],
                friendlyEditors: (metadata.friendlyEditors ?? []),
                fields,
            };
            return panelMetadata;
        };
    }
    renderPanel() {
        const activeNode = this.activeNode;
        const panelMetadata = this.getPanelMetadata(activeNode);
        const friendlyEditors = panelMetadata?.friendlyEditors ?? [];
        const { editable, readOnly } = this.getAttrEntriesByEditability(activeNode);
        return html `
      <section class="card border border-base-300/50 bg-base-100">
        <div class="card-body gap-3 p-4">
          ${this.renderHeader(activeNode)} ${this.renderNodeSwitcher()}
          <div class="flex flex-col gap-3">
            ${friendlyEditors.map(editor => this.renderFriendlyEditor(editor, activeNode))}
            ${activeNode
            ? html `
                  ${editable.length
                ? editable.map(([key, value]) => this.renderField(key, value, this.getFieldMetadata(key, value)))
                : friendlyEditors.length
                    ? nothing
                    : html `<p class="text-sm text-base-content/70">No editable attributes.</p>`}
                  ${readOnly.length
                ? html `
                        <details class="rounded-lg border border-base-300/50 bg-base-50 p-2">
                          <summary class="cursor-pointer text-sm font-medium">
                            Read-only attributes (${readOnly.length})
                          </summary>
                          <div class="mt-3 flex flex-col gap-3 opacity-80">
                            ${readOnly.map(([key, value]) => this.renderField(key, value, this.getFieldMetadata(key, value), true))}
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
    renderFriendlyEditor(editor, activeNode) {
        if (!activeNode)
            return nothing;
        if (editor.kind === 'choiceInteractionClass' &&
            activeNode.type.toLowerCase() === CHOICE_INTERACTION_NODE_TYPE) {
            return this.renderChoiceInteractionClassEditor(activeNode);
        }
        return nothing;
    }
    renderChoiceInteractionClassEditor(activeNode) {
        const classState = parseChoiceInteractionClasses(String(activeNode.attrs.class ?? ''));
        return html `
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
            return html `
              <div class="choice-editor__group">
                <div class="choice-editor__group-header">
                  <div class="choice-editor__group-title">${groupPresentation?.title ?? group.title}</div>
                  ${groupPresentation?.tooltip
                ? html `<div class="choice-editor__group-tooltip">
                        ${groupPresentation.tooltip}
                      </div>`
                : nothing}
                </div>
                <div class="choice-editor__options">
                  ${group.selection === 'boolean'
                ? this.renderChoiceInteractionBooleanOption(activeNode, classState, group.id, group.options[0])
                : group.options.map(option => {
                    const optionPresentation = this.choiceInteractionPresentation?.options?.[option.value];
                    return html `
                          <label class="choice-editor__option">
                            <input
                              type="radio"
                              name=${group.id}
                              .value=${option.value}
                              .checked=${selectedValue === option.value}
                              @change=${() => this.updateChoiceInteractionClass(activeNode, classState, group.id, option.value)}
                            />
                            <span class="choice-editor__icon">${optionPresentation?.icon ?? nothing}</span>
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
    getSelectedGroupValue(classState, groupId) {
        if (groupId === 'inputControlHidden') {
            return classState.inputControlHidden ? 'qti-input-control-hidden' : null;
        }
        return classState[groupId];
    }
    renderChoiceInteractionBooleanOption(activeNode, classState, groupId, option) {
        const optionPresentation = this.choiceInteractionPresentation?.options?.[option.value];
        return html `
      <label class="choice-editor__option">
        <input
          type="checkbox"
          .checked=${classState.inputControlHidden}
          @change=${(event) => this.updateChoiceInteractionBoolean(activeNode, classState, groupId, event.target.checked)}
        />
        <span class="choice-editor__icon">${optionPresentation?.icon ?? nothing}</span>
        <span title=${optionPresentation?.tooltip ?? option.description ?? ''}>
          ${optionPresentation?.label ?? option.label}
        </span>
      </label>
    `;
    }
    updateChoiceInteractionClass(activeNode, classState, groupId, className) {
        const nextState = {
            ...classState,
            [groupId]: className,
        };
        const nextClassValue = serializeChoiceInteractionClasses(nextState);
        this.updateChoiceInteractionAttrs(activeNode, nextClassValue);
    }
    updateChoiceInteractionBoolean(activeNode, classState, groupId, checked) {
        const nextState = {
            ...classState,
            [groupId]: checked,
        };
        const nextClassValue = serializeChoiceInteractionClasses(nextState);
        this.updateChoiceInteractionAttrs(activeNode, nextClassValue);
    }
    updateChoiceInteractionAttrs(activeNode, classValue) {
        if (this.activeNode?.pos !== activeNode.pos)
            return;
        this.updateActiveNodeAttrs({ class: classValue });
    }
};
Object.defineProperty(QtiAttributesPanel, "styles", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: [
        ProsekitAttributesPanel.styles,
        css `
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
    ]
});
QtiAttributesPanel = __decorate([
    customElement('qti-attributes-panel')
], QtiAttributesPanel);
export { QtiAttributesPanel };
export function defineExtension(options = {}) {
    return union(qtiAttributesExtension({
        eventName: options.eventName ?? 'qti:attributes:update',
        eventTarget: options.eventTarget ?? document,
        eligible: options.eligible,
        trigger: options.trigger,
        onUpdate: options.onUpdate,
    }));
}
export { qtiAttributesExtension, qtiSidePanelExtension, updateQtiNodeAttrs };
