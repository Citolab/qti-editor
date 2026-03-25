/* eslint-disable lit/attribute-value-entities */
/**
 * QTI Slash Menu
 *
 * App-level slash menu that extends the default prosekit slash menu with
 * QTI interaction insert commands (Choice, Extended Text, Text Entry).
 *
 * This component reuses the `<prosekit-autocomplete-popover>`,
 * `<prosekit-autocomplete-list>`, and `<lit-editor-slash-menu-item>`
 * elements from prosekit, adding QTI-specific items in a separate group.
 */

import 'prosekit/lit/autocomplete';
import '@qti-editor/ui/components/editor/ui/slash-menu';

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { canUseRegexLookbehind, type Editor } from 'prosekit/core';
import { insertChoiceInteraction } from '@qti-editor/interaction-choice';
import { insertExtendedTextInteraction } from '@qti-editor/interaction-extended-text';

import type { EditorView } from 'prosekit/pm/view';

const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u;

@customElement('qti-slash-menu')
export class QtiSlashMenu extends LitElement {
  @property({ attribute: false })
  accessor editor: Editor | null = null;

  override createRenderRoot() {
    return this;
  }

  private getView(): EditorView | null {
    return (this.editor as any)?.view ?? null;
  }

  private insertInteraction(command: (state: any, dispatch: any) => boolean) {
    const view = this.getView();
    if (!view) return;
    command(view.state, view.dispatch);
    view.focus();
  }

  private insertTextEntry() {
    const view = this.getView();
    if (!view) return;
    const nodeType = view.state.schema.nodes.qtiTextEntryInteraction;
    if (!nodeType) return;
    const node = nodeType.createAndFill({ responseIdentifier: `RESPONSE_${crypto.randomUUID()}` });
    if (!node) return;
    view.dispatch(view.state.tr.replaceSelectionWith(node));
    view.focus();
  }

  override render() {
    const editor = this.editor;
    if (!editor) return html``;

    return html`<prosekit-autocomplete-popover
      .editor=${editor}
      .regex=${regex}
      class="dropdown-content relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-10 box-border rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg [&:not([data-state])]:hidden"
    >
      <prosekit-autocomplete-list .editor=${editor}>
        <!-- QTI Interactions -->
        <div
          class="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none"
        >
          Interactions
        </div>
        <lit-editor-slash-menu-item
          class="contents"
          label="Choice Interaction"
          @select=${() => this.insertInteraction(insertChoiceInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Extended Text"
          @select=${() => this.insertInteraction(insertExtendedTextInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Text Entry"
          @select=${() => this.insertTextEntry()}
        ></lit-editor-slash-menu-item>
      </prosekit-autocomplete-list>
    </prosekit-autocomplete-popover>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-slash-menu': QtiSlashMenu;
  }
}
