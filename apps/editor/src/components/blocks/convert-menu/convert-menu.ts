/* eslint-disable wc/no-self-class, lit/attribute-value-entities */
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { QtiI18nController, translateQti } from '@qti-editor/interaction-shared/i18n/index.js';
import { defineUpdateHandler, type Editor } from 'prosekit/core';
import { Selection } from 'prosekit/pm/state';
import { PopoverContent, PopoverRoot, PopoverTrigger } from 'prosekit/lit/popover';
import {
  canConvertFlatListToChoiceInteraction,
  convertFlatListToChoiceInteraction,
} from '@qti-editor/interaction-choice';

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

export interface ConvertMenuItem {
  label: string;
  canRun: boolean;
  command: () => void;
}

function getConvertItems(view: EditorView): ConvertMenuItem[] {
  return [
    {
      label: translateQti('convert.flatListToChoice', { target: view.dom }),
      canRun: canConvertFlatListToChoiceInteraction(view),
      command: () => {
        convertFlatListToChoiceInteraction(view);
        view.focus();
      },
    },
  ];
}

@customElement('qti-convert-menu')
export class QtiConvertMenu extends LitElement {
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

  private handleConvert(item: ConvertMenuItem) {
    this.restoreSelection();
    item.command();
    this.open = false;
  }

  override render() {
    const view = this.getEditorView();
    const items = view ? getConvertItems(view) : [];
    const canRunAny = items.some(item => item.canRun);

    return html`
      <prosekit-popover-root .open=${this.open} @openChange=${this.handleOpenChange}>
        <prosekit-popover-trigger>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 dark:hover:bg-gray-800"
            ?disabled=${!canRunAny}
            @mousedown=${this.handleTriggerMouseDown}
          >
            <span class="i-lucide-arrow-right-left size-4 block" aria-hidden="true"></span>
            <span>${this.i18n.t('convert.trigger')}</span>
          </button>
        </prosekit-popover-trigger>
        <prosekit-popover-content class="flex min-w-64 flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950 [&:not([data-state])]:hidden">
          ${items.map(
            item => html`
              <button
                type="button"
                class="w-full rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-50 dark:hover:bg-gray-800"
                ?disabled=${!item.canRun}
                @mousedown=${(event: MouseEvent) => event.preventDefault()}
                @click=${() => this.handleConvert(item)}
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
    'qti-convert-menu': QtiConvertMenu;
  }
}
