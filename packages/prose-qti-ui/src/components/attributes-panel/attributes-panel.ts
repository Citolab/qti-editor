import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { defineMountHandler, union, type Editor, type Extension } from 'prosekit/core';
import { getNodeAttributePanelMetadataByNodeTypeName } from '@citolab/prose-qti/core/interactions/composer';
import { translateQti } from '@citolab/prose-qti/components/shared';
import {
  qtiAttributesExtension,
  qtiSidePanelExtension,
  updateQtiNodeAttrs,
  type QtiAttributesOptions,
  type QtiAttributesTrigger,
  type QtiAttributesTriggerContext,
  type SidePanelEventDetail,
  type SidePanelNodeDetail,
} from '@citolab/prose-extensions/attributes';
import {
  ProsekitAttributesPanel,
  type AttributeFriendlyEditorDefinition,
  type AttributesNodeDetail,
  type NodeAttributePanelMetadata,
} from '@citolab/prose-extensions/attributes-ui';
import '../choice-attributes-editor';
import '../text-entry-attributes-editor';
import '../extended-text-attributes-editor';
import { editorContext } from '@citolab/prose-qti/integration/editor-context';

import { type ChoiceInteractionPanelPresentation } from '../choice-attributes-editor';
import { type QtiAttributesPatchDetail } from './patch-event';

export interface AttributesPanelExtensionOptions extends QtiAttributesOptions {}

@customElement('qti-attributes-panel')
export class QtiAttributesPanel extends ProsekitAttributesPanel {
  @property({ attribute: false })
  choiceInteractionPresentation: ChoiceInteractionPanelPresentation | null = null;

  #editor: Editor | null = null;
  #internalEventTarget = new EventTarget();
  #unregisterExtension: VoidFunction | null = null;

  #editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
    callback: value => {
      this.#setEditor((value as Editor) ?? null);
    },
  });

  #setEditor(value: Editor | null) {
    if (this.#editor === value) return;
    this.#teardownExtension();
    this.#editor = value;
    this.#setupExtension();
  }

  protected override getEventTarget(): EventTarget {
    return this.#internalEventTarget;
  }

  constructor() {
    super();
    void this.#editorConsumer;
    this.eventName = 'qti:attributes:update';
    this.changeEventName = 'qti:attributes:change';
    this.metadataResolver = (nodeType, node) => {
      const metadata = getNodeAttributePanelMetadataByNodeTypeName(nodeType);
      if (!metadata) return null;

      const fields: NodeAttributePanelMetadata['fields'] = {};
      for (const key of Object.keys(node.attrs ?? {})) {
        fields[key] = metadata.fields?.[key] ?? { label: key };
      }

      const panelMetadata: NodeAttributePanelMetadata = {
        nodeTypeName: metadata.nodeTypeName,
        editableAttributes: [...(metadata.editableAttributes ?? [])],
        friendlyEditors: (metadata.friendlyEditors ?? []) as AttributeFriendlyEditorDefinition[],
        fields,
      };

      return panelMetadata;
    };
  }

  #setupExtension() {
    if (!this.#editor) return;

    const ext = union(
      qtiAttributesExtension({ eventTarget: this.#internalEventTarget }),
      defineMountHandler(() => {
        this.editorView = (this.#editor as any).view ?? null;
      }),
    );

    this.#unregisterExtension = this.#editor.use(ext);

    if (this.#editor.mounted) {
      this.editorView = (this.#editor as any).view ?? null;
    }
  }

  #teardownExtension() {
    this.#unregisterExtension?.();
    this.#unregisterExtension = null;
    this.editorView = null;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#teardownExtension();
  }

  private handleFriendlyEditorPatch(event: CustomEvent<QtiAttributesPatchDetail>) {
    event.stopPropagation();

    const detail = event.detail;
    if (!detail) return;

    this.updateNodeAttrsByPos(detail.pos, detail.attrs as Record<string, any>);
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
    node: AttributesNodeDetail,
  ): TemplateResult | typeof nothing {
    if (editor.kind === 'choiceInteractionClass') {
      return html`
        <qti-choice-attributes-editor
          .activeNode=${node}
          .presentation=${this.choiceInteractionPresentation}
        ></qti-choice-attributes-editor>
      `;
    }

    if (editor.kind === 'textEntryAttributes') {
      return html`<qti-text-entry-attributes-editor .activeNode=${node}></qti-text-entry-attributes-editor>`;
    }

    if (editor.kind === 'extendedTextAttributes') {
      return html`<qti-extended-text-attributes-editor .activeNode=${node}></qti-extended-text-attributes-editor>`;
    }

    return nothing;
  }

  private renderMissingCorrectResponseWarning(node: AttributesNodeDetail): TemplateResult | typeof nothing {
    const attrs = node.attrs ?? {};
    if (!('correctResponse' in attrs)) return nothing;
    const cr = attrs.correctResponse;
    const isEmpty = cr == null || (Array.isArray(cr) ? cr.length === 0 : String(cr).trim().length === 0);
    if (!isEmpty) return nothing;
    return html`
      <div class="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-content">
        <span class="i-lucide-triangle-alert mt-0.5 size-3.5 shrink-0 text-warning"></span>
        <span>${translateQti('attributes.correctResponseMissing', { target: this })}</span>
      </div>
    `;
  }

  /**
   * Custom node section: if the descriptor declares friendly editors for this
   * node type, render them in place of the generic fields (per the
   * replace-not-supplement contract enforced by the base class).
   */
  protected override renderCustomNodeSection(
    node: AttributesNodeDetail,
    metadata: NodeAttributePanelMetadata | null,
  ): TemplateResult | typeof nothing {
    const friendlyEditors = metadata?.friendlyEditors ?? [];
    if (friendlyEditors.length === 0) return nothing;

    return html`
      ${this.renderMissingCorrectResponseWarning(node)}
      ${friendlyEditors.map(editor => this.renderFriendlyEditor(editor, node))}
    `;
  }

  protected override renderPanel(): TemplateResult {
    return html`
      <div
        @qti:attributes:patch=${this.handleFriendlyEditorPatch}
        @mousedown=${this.handlePanelMousedown}
      >
        ${super.renderPanel()}
      </div>
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
export type { ChoiceInteractionPanelPresentation } from '../choice-attributes-editor';

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel': QtiAttributesPanel;
  }
}
