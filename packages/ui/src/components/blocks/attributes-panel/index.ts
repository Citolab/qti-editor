import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { union, type Extension } from 'prosekit/core';
import { getNodeAttributePanelMetadataByNodeTypeName } from '@qti-editor/core/interactions/composer';
import {
  qtiAttributesExtension,
  qtiSidePanelExtension,
  updateQtiNodeAttrs,
  type QtiAttributesOptions,
  type QtiAttributesTrigger,
  type QtiAttributesTriggerContext,
  type SidePanelEventDetail,
  type SidePanelNodeDetail,
} from '@qti-editor/prosemirror-attributes';
import {
  ProsekitAttributesPanel,
  type AttributeFriendlyEditorDefinition,
  type AttributesNodeDetail,
  type NodeAttributePanelMetadata,
} from '@qti-editor/prosemirror-attributes-ui-prosekit';

import '@qti-editor/ui/components/blocks/choice-attributes-editor';
import '@qti-editor/ui/components/blocks/text-entry-attributes-editor';
import { type ChoiceInteractionPanelPresentation } from '@qti-editor/ui/components/blocks/choice-attributes-editor';
import { type QtiAttributesPatchDetail } from '@qti-editor/ui/components/blocks/attributes-panel/patch-event';

export interface AttributesPanelExtensionOptions extends QtiAttributesOptions {}

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends ProsekitAttributesPanel {
  @property({ attribute: false })
  declare public choiceInteractionPresentation: ChoiceInteractionPanelPresentation | null;

  constructor() {
    super();
    this.choiceInteractionPresentation = null;
    this.eventName = 'qti:attributes:update';
    this.changeEventName = 'qti:attributes:change';
    this.metadataResolver = (nodeType, node) => {
      const metadata = getNodeAttributePanelMetadataByNodeTypeName(nodeType);
      if (!metadata) return null;

      const fields: NodeAttributePanelMetadata['fields'] = {};
      for (const key of Object.keys(node.attrs ?? {})) {
        fields[key] = { label: key };
      }

      const panelMetadata: NodeAttributePanelMetadata = {
        nodeTypeName: metadata.nodeTypeName,
        editableAttributes: [...(metadata.editableAttributes ?? [])],
        hiddenAttributes: [...(metadata.hiddenAttributes ?? [])],
        friendlyEditors: (metadata.friendlyEditors ?? []) as AttributeFriendlyEditorDefinition[],
        fields,
      };

      return panelMetadata;
    };
  }

  private handleFriendlyEditorPatch(event: CustomEvent<QtiAttributesPatchDetail>) {
    event.stopPropagation();

    const activeNode = this.activeNode;
    const detail = event.detail;
    if (!activeNode || !detail) return;
    if (detail.pos !== activeNode.pos) return;

    this.updateActiveNodeAttrs(detail.attrs as Record<string, any>);
  }

  /**
   * Prevents mousedown from stealing focus and changing editor selection.
   * Only allows focus for interactive elements (inputs, buttons, selects).
   */
  private handlePanelMousedown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const interactiveElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
    const isInteractive = 
      interactiveElements.includes(target.tagName) ||
      target.closest('input, textarea, select, button, [contenteditable="true"]');
    
    if (!isInteractive) {
      event.preventDefault();
    }
  }

  private renderFriendlyEditor(
    editor: AttributeFriendlyEditorDefinition,
    activeNode: AttributesNodeDetail | null,
  ): TemplateResult | typeof nothing {
    if (!activeNode) return nothing;

    if (editor.kind === 'choiceInteractionClass') {
      return html`
        <qti-choice-attributes-editor
          .activeNode=${activeNode}
          .presentation=${this.choiceInteractionPresentation}
        ></qti-choice-attributes-editor>
      `;
    }

    if (editor.kind === 'textEntryAttributes') {
      return html`<qti-text-entry-attributes-editor .activeNode=${activeNode}></qti-text-entry-attributes-editor>`;
    }

    return nothing;
  }

  protected override renderPanel(): TemplateResult {
    const activeNode = this.activeNode;
    const panelMetadata = this.getPanelMetadata(activeNode);
    const friendlyEditors = panelMetadata?.friendlyEditors ?? [];
    const { editable, readOnly } = this.getAttrEntriesByEditability(activeNode);

    return html`
      <section
        class="card border border-base-300/50 bg-base-100"
        @qti:attributes:patch=${this.handleFriendlyEditorPatch}
        @mousedown=${this.handlePanelMousedown}
      >
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
}

export function defineExtension(options: AttributesPanelExtensionOptions = {}): Extension {
  return union(
    qtiAttributesExtension({
      eventName: options.eventName ?? 'qti:attributes:update',
      eventTarget: options.eventTarget ?? document,
      eligible: options.eligible,
      trigger: options.trigger,
      onUpdate: options.onUpdate,
    }),
  );
}

export { qtiAttributesExtension, qtiSidePanelExtension, updateQtiNodeAttrs };

export type {
  QtiAttributesOptions,
  QtiAttributesTrigger,
  QtiAttributesTriggerContext,
  SidePanelEventDetail,
  SidePanelNodeDetail,
};
export type { ChoiceInteractionPanelPresentation } from '@qti-editor/ui/components/blocks/choice-attributes-editor';

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
