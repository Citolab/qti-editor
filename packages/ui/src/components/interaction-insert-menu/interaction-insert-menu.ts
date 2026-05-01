/* eslint-disable wc/no-self-class */
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { translateQti, QtiI18nController } from '@qti-editor/interaction-shared/i18n/index.js';
import { defineUpdateHandler, type Editor } from 'prosekit/core';
import { Selection } from 'prosekit/pm/state';
import 'prosekit/lit/menu';
import { insertAssociateInteraction } from '@qti-editor/interaction-associate';
import { insertGapMatchInteraction, insertGap } from '@qti-editor/interaction-gap-match';
import { insertChoiceInteraction } from '@qti-editor/interaction-choice';
import { insertExtendedTextInteraction } from '@qti-editor/interaction-extended-text';
import { insertHottextInteraction } from '@qti-editor/interaction-hottext';
import { insertMatchInteraction } from '@qti-editor/interaction-match';
import { insertOrderInteraction } from '@qti-editor/interaction-order';
import { insertSelectPointInteraction } from '@qti-editor/interaction-select-point';
import { insertInlineChoiceInteraction } from '@qti-editor/interaction-inline-choice';
import { insertItemDivider } from '@qti-editor/qti-item-divider';

import type { EditorView } from 'prosekit/pm/view';

export interface InteractionInsertItem {
  label: string;
  canInsert: boolean;
  command: () => void;
}

function canInsert(view: EditorView, nodeType: any): boolean {
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const index = $from.index(depth);
    if ($from.node(depth).canReplaceWith(index, index, nodeType)) {
      return true;
    }
  }
  return false;
}

function canInsertInline(view: EditorView, nodeType: any): boolean {
  // For inline nodes, check all ancestor levels to see if we can insert
  // This handles cases like: start of paragraph, middle of text, end of paragraph
  const { $from } = view.state.selection;
  
  // First, check if we're directly in a block that accepts inline content
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    
    if (node.type.inlineContent) {
      // We're in a block that accepts inline content
      const index = $from.index(depth);
      if (node.canReplaceWith(index, index, nodeType)) {
        return true;
      }
    }
  }
  
  return false;
}

function isSelectionInsideNodeType(view: EditorView, nodeType: any): boolean {
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type === nodeType) {
      return true;
    }
  }
  return false;
}

function getInteractionInsertItems(view: EditorView): InteractionInsertItem[] {
  const schema: any = view.state.schema;
  const items: InteractionInsertItem[] = [];

  // Order matches registeredDescriptors in @qti-editor/core/interactions/composer.ts

  // 1. Associate Interaction
  if (schema.nodes.qtiAssociateInteraction && schema.nodes.qtiSimpleAssociableChoice) {
    const nodeType = schema.nodes.qtiAssociateInteraction;
    items.push({
      label: translateQti('interactionInsert.associate', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertAssociateInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 2. Choice Interaction
  if (
    schema.nodes.qtiChoiceInteraction &&
    schema.nodes.qtiPrompt &&
    schema.nodes.qtiSimpleChoice &&
    schema.nodes.qtiPromptParagraph &&
    schema.nodes.qtiSimpleChoiceParagraph
  ) {
    const nodeType = schema.nodes.qtiChoiceInteraction;
    items.push({
      label: translateQti('interactionInsert.choice', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertChoiceInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 3. Extended Text Interaction
  if (schema.nodes.qtiExtendedTextInteraction) {
    const nodeType = schema.nodes.qtiExtendedTextInteraction;
    items.push({
      label: translateQti('interactionInsert.extendedText', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertExtendedTextInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 4. Gap Match Interaction + Gap (conditional)
  if (schema.nodes.qtiGapMatchInteraction && schema.nodes.qtiGapText && schema.nodes.qtiGap) {
    const nodeType = schema.nodes.qtiGapMatchInteraction;
    items.push({
      label: translateQti('interactionInsert.gapMatch', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertGapMatchInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });

    // Add gap insertion option (only when inside a gap-match interaction)
    items.push({
      label: translateQti('interactionInsert.gap', { target: view.dom }),
      canInsert: insertGap(view.state),
      command: () => {
        insertGap(view.state, view.dispatch);
        view.focus();
      },
    });
  }

  // 5. Hottext Interaction
  if (schema.nodes.qtiHottextInteraction && schema.nodes.qtiHottext) {
    const nodeType = schema.nodes.qtiHottextInteraction;
    items.push({
      label: translateQti('interactionInsert.hottext', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertHottextInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 6. Inline Choice Interaction
  if (schema.nodes.qtiInlineChoiceInteraction && schema.nodes.qtiInlineChoice) {
    const nodeType = schema.nodes.qtiInlineChoiceInteraction;
    items.push({
      label: translateQti('interactionInsert.inlineChoice', { target: view.dom }),
      canInsert: !isSelectionInsideNodeType(view, nodeType) && canInsertInline(view, nodeType),
      command: () => {
        insertInlineChoiceInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 7. Match Interaction
  if (schema.nodes.qtiMatchInteraction && schema.nodes.qtiSimpleMatchSet && schema.nodes.qtiSimpleAssociableChoice) {
    const nodeType = schema.nodes.qtiMatchInteraction;
    items.push({
      label: translateQti('interactionInsert.match', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertMatchInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 8. Order Interaction
  if (schema.nodes.qtiOrderInteraction && schema.nodes.qtiSimpleChoice) {
    const nodeType = schema.nodes.qtiOrderInteraction;
    items.push({
      label: translateQti('interactionInsert.order', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertOrderInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 9. Select Point Interaction
  if (schema.nodes.qtiSelectPointInteraction) {
    const nodeType = schema.nodes.qtiSelectPointInteraction;
    items.push({
      label: translateQti('interactionInsert.selectPoint', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertSelectPointInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

  // 10. Text Entry Interaction
  if (schema.nodes.qtiTextEntryInteraction) {
    const nodeType = schema.nodes.qtiTextEntryInteraction;
    items.push({
      label: translateQti('interactionInsert.textEntry', { target: view.dom }),
      canInsert: canInsertInline(view, nodeType),
      command: () => {
        const node = nodeType.createAndFill({ responseIdentifier: `RESPONSE_${crypto.randomUUID()}` });
        if (!node) return;
        view.dispatch(view.state.tr.replaceSelectionWith(node));
        view.focus();
      },
    });
  }

  // 11. Item Divider
  if (schema.nodes.qtiItemDivider) {
    const nodeType = schema.nodes.qtiItemDivider;
    items.push({
      label: translateQti('interactionInsert.itemDivider', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertItemDivider(view.state, view.dispatch);
        view.focus();
      },
    });
  }

  return items;
}

@customElement('qti-interaction-insert-menu')
export class QtiInteractionInsertMenu extends LitElement {
  private readonly i18n = new QtiI18nController(this);

  @property({ attribute: false })
  editor: Editor | null = null;

  @state()
  open = false;

  private removeUpdateExtension?: () => void;
  private lastSelectionJson: ReturnType<Selection['toJSON']> | null = null;

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add('contents');
    this.attachEditorListener();
  }

  override disconnectedCallback() {
    this.detachEditorListener();
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('editor')) {
      this.attachEditorListener();
    }
  }

  private attachEditorListener() {
    this.detachEditorListener();
    if (!this.editor) return;
    this.removeUpdateExtension = this.editor.use(defineUpdateHandler(() => this.requestUpdate()));
  }

  private detachEditorListener() {
    this.removeUpdateExtension?.();
    this.removeUpdateExtension = undefined;
  }

  private getEditorView(): EditorView | null {
    return ((this.editor as any)?.view ?? null) as EditorView | null;
  }

  private snapshotSelection() {
    const view = this.getEditorView();
    if (!view) return;
    this.lastSelectionJson = view.state.selection.toJSON();
  }

  private restoreSelection() {
    const view = this.getEditorView();
    if (!view || !this.lastSelectionJson) return;

    try {
      const restored = Selection.fromJSON(view.state.doc, this.lastSelectionJson);
      view.dispatch(view.state.tr.setSelection(restored));
    } catch {
      return;
    }
  }

  private handleTriggerMouseDown = (event: MouseEvent) => {
    this.snapshotSelection();
    event.preventDefault();
  };

  private handleOpenChange = (event: CustomEvent<boolean>) => {
    if (event.detail) {
      this.snapshotSelection();
    }
    this.open = event.detail;
  };

  private handleItemSelect(item: InteractionInsertItem) {
    // Restore selection and execute command
    // Menu will auto-close via the @select event
    this.restoreSelection();
    item.command();
  }

  override render() {
    const view = this.getEditorView();
    const items = view ? getInteractionInsertItems(view) : [];
    const canInsertAny = items.some(item => item.canInsert);

    return html`
      <prosekit-menu-root @open-change=${this.handleOpenChange}>
        <prosekit-menu-trigger>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 dark:hover:bg-gray-800"
            ?disabled=${!canInsertAny}
            @mousedown=${this.handleTriggerMouseDown}
          >
            <span class="i-lucide-plus size-4 block" aria-hidden="true"></span>
            <span>${this.i18n.t('interactionInsert.trigger')}</span>
          </button>
        </prosekit-menu-trigger>
        <prosekit-menu-positioner placement="bottom" class="block overflow-visible w-min h-min z-50 ease-out transition-transform duration-100 motion-reduce:transition-none">
          <prosekit-menu-popup class="box-border origin-(--transform-origin) transition-[opacity,scale] transition-discrete motion-reduce:transition-none data-[state=closed]:duration-150 data-[state=closed]:opacity-0 starting:opacity-0 data-[state=closed]:scale-95 starting:scale-95 duration-40 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg bg-[canvas] flex min-w-56 flex-col gap-1 p-2 text-sm">
          ${items.map(
            item => item.canInsert
              ? html`
                <prosekit-menu-item
                  class="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 cursor-pointer outline-hidden data-highlighted:bg-gray-100 dark:text-gray-50 dark:data-highlighted:bg-gray-800"
                  .closeOnSelect=${true}
                  @select=${() => this.handleItemSelect(item)}
                >
                  ${item.label}
                </prosekit-menu-item>
              `
              : html`
                <div class="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-400 pointer-events-none opacity-50 dark:text-gray-500">
                  ${item.label}
                </div>
              `,
          )}
          </prosekit-menu-popup>
        </prosekit-menu-positioner>
      </prosekit-menu-root>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-interaction-insert-menu': QtiInteractionInsertMenu;
  }
}
