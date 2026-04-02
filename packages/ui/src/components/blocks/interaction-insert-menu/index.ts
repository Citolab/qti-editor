/* eslint-disable wc/no-self-class, lit/attribute-value-entities */
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { translateQti, QtiI18nController } from '@qti-editor/interaction-shared/i18n/index.js';
import { defineUpdateHandler, type Editor } from 'prosekit/core';
import { Selection } from 'prosekit/pm/state';
import { PopoverContent, PopoverRoot, PopoverTrigger } from 'prosekit/lit/popover';
import { insertChoiceInteraction } from '@qti-editor/interaction-choice';
import { insertExtendedTextInteraction } from '@qti-editor/interaction-extended-text';
import { insertMatchInteraction } from '@qti-editor/interaction-match';
import { insertOrderInteraction } from '@qti-editor/interaction-order';
import { insertSelectPointInteraction } from '@qti-editor/interaction-select-point';
import { insertInlineChoiceInteraction } from '@qti-editor/interaction-inline-choice';

import type { EditorView } from 'prosekit/pm/view';

if (!customElements.get('prosekit-popover-root')) {
  customElements.define('prosekit-popover-root', PopoverRoot);
}
if (!customElements.get('prosekit-popover-trigger')) {
  customElements.define('prosekit-popover-trigger', PopoverTrigger);
}
if (!customElements.get('prosekit-popover-content')) {
  customElements.define('prosekit-popover-content', PopoverContent);
}

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

function getInteractionInsertItems(view: EditorView): InteractionInsertItem[] {
  const schema: any = view.state.schema;
  const items: InteractionInsertItem[] = [];

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

  if (schema.nodes.qtiTextEntryInteraction) {
    const nodeType = schema.nodes.qtiTextEntryInteraction;
    items.push({
      label: translateQti('interactionInsert.textEntry', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        const node = nodeType.createAndFill({ responseIdentifier: `RESPONSE_${crypto.randomUUID()}` });
        if (!node) return;
        view.dispatch(view.state.tr.replaceSelectionWith(node));
        view.focus();
      },
    });
  }

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

  if (schema.nodes.qtiInlineChoiceInteraction && schema.nodes.qtiInlineChoice) {
    const nodeType = schema.nodes.qtiInlineChoiceInteraction;
    items.push({
      label: translateQti('interactionInsert.inlineChoice', { target: view.dom }),
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertInlineChoiceInteraction(view.state, view.dispatch, view);
        view.focus();
      },
    });
  }

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

  private handleInsert(item: InteractionInsertItem) {
    this.restoreSelection();
    item.command();
    this.open = false;
  }

  override render() {
    const view = this.getEditorView();
    const items = view ? getInteractionInsertItems(view) : [];
    const canInsertAny = items.some(item => item.canInsert);

    return html`
      <prosekit-popover-root .open=${this.open} @openChange=${this.handleOpenChange}>
        <prosekit-popover-trigger>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 dark:hover:bg-gray-800"
            ?disabled=${!canInsertAny}
            @mousedown=${this.handleTriggerMouseDown}
          >
            <span class="i-lucide-plus size-4 block" aria-hidden="true"></span>
            <span>${this.i18n.t('interactionInsert.trigger')}</span>
          </button>
        </prosekit-popover-trigger>
        <prosekit-popover-content class="flex min-w-56 flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950 [&:not([data-state])]:hidden">
          ${items.map(
            item => html`
              <button
                type="button"
                class="w-full rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-50 dark:hover:bg-gray-800"
                ?disabled=${!item.canInsert}
                @mousedown=${(event: MouseEvent) => event.preventDefault()}
                @click=${() => this.handleInsert(item)}
              >
                ${item.label}
              </button>
            `,
          )}
        </prosekit-popover-content>
      </prosekit-popover-root>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-interaction-insert-menu': QtiInteractionInsertMenu;
  }
}
