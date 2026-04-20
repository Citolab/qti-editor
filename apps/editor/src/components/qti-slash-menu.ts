/* eslint-disable lit/attribute-value-entities */
/**
 * QTI Slash Menu
 *
 * App-level slash menu that dynamically loads QTI interactions from the descriptor registry.
 * Uses the descriptor pattern to automatically populate the slash menu with all registered interactions.
 */

import 'prosekit/lit/autocomplete';
import '@qti-editor/ui/components/editor/ui/slash-menu';

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { canUseRegexLookbehind, type Editor } from 'prosekit/core';
import { translateQti } from '@qti-editor/interaction-shared';
import { listInteractionDescriptors } from '@qti-editor/core/interactions/composer';

import type { EditorView } from 'prosekit/pm/view';

const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u;

// Map tag names to i18n keys
const TAG_TO_I18N_KEY: Record<string, string> = {
  'qti-choice-interaction': 'interactionInsert.choice',
  'qti-extended-text-interaction': 'interactionInsert.extendedText',
  'qti-text-entry-interaction': 'interactionInsert.textEntry',
  'qti-inline-choice-interaction': 'interactionInsert.inlineChoice',
  'qti-hottext-interaction': 'interactionInsert.hottext',
  'qti-associate-interaction': 'interactionInsert.associate',
  'qti-match-interaction': 'interactionInsert.match',
  'qti-order-interaction': 'interactionInsert.order',
  'qti-select-point-interaction': 'interactionInsert.selectPoint',
  'qti-gap-match-interaction': 'interactionInsert.gapMatch',
  'qti-item-divider': 'interactionInsert.itemDivider',
};

@customElement('qti-slash-menu')
export class QtiSlashMenu extends LitElement {
  @property({ attribute: false })
  editor: Editor | null = null;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  override createRenderRoot() {
    return this;
  }

  private getView(): EditorView | null {
    return (this.editor as any)?.view ?? null;
  }

  private insertInteraction(insertCommand: any) {
    const view = this.getView();
    if (!view) return;
    insertCommand(view.state, view.dispatch, view);
    view.focus();
  }

  override render() {
    const editor = this.editor;
    if (!editor) return html``;

    // Get all registered interaction descriptors
    const descriptors = listInteractionDescriptors();
    
    // Build menu items array before rendering
    const menuItems = descriptors
      .filter(d => d.insertCommand && TAG_TO_I18N_KEY[d.tagName])
      .map(descriptor => {
        const i18nKey = TAG_TO_I18N_KEY[descriptor.tagName];
        const label = translateQti(i18nKey, { target: this });
        return html`
          <lit-editor-slash-menu-item
            class="contents"
            label=${label}
            @select=${() => this.insertInteraction(descriptor.insertCommand)}
          ></lit-editor-slash-menu-item>
        `;
      });

    return html`<prosekit-autocomplete-popover
      .editor=${editor}
      .regex=${this.disabled ? null : regex}
      class="dropdown-content relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-10 box-border rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg [&:not([data-state])]:hidden"
    >
      <prosekit-autocomplete-list .editor=${editor}>
        <!-- QTI Interactions -->
        <div
          class="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none"
        >
          ${translateQti('slashMenu.interactions', { target: this })}
        </div>
        ${menuItems}
      </prosekit-autocomplete-list>
    </prosekit-autocomplete-popover>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-slash-menu': QtiSlashMenu;
  }
}
