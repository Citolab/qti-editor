/* eslint-disable lit/attribute-value-entities */
/**
 * QTI Slash Menu
 *
 * App-level slash menu that dynamically loads QTI interactions from the descriptor registry.
 * Uses the descriptor pattern to automatically populate the slash menu with all registered interactions.
 */

import 'prosekit/lit/autocomplete';
import '@qti-editor/ui/components/slash-menu/slash-menu-item.js';
import '@qti-editor/ui/components/slash-menu/slash-menu-empty.js';

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { canUseRegexLookbehind, type Editor } from 'prosekit/core';
import { translateQti } from '@qti-editor/interaction-shared';
import { listInteractionDescriptors } from '@qti-editor/core/interactions/composer';
import { insertGap } from '@qti-editor/interaction-gap-match';

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

    // Check if gap insertion is available (only when inside gap-match interaction)
    const view = this.getView();
    const canInsertGap = view ? insertGap(view.state) : false;

    // Type assertion for commands - these exist at runtime from prosekit extensions
    const commands = (editor as any).commands;

    return html`<prosekit-autocomplete-root
      .editor=${editor}
      .regex=${this.disabled ? null : regex}
    >
      <prosekit-autocomplete-positioner class="block overflow-visible w-min h-min z-50 ease-out transition-transform duration-100 motion-reduce:transition-none">
        <prosekit-autocomplete-popup class="box-border origin-(--transform-origin) transition-[opacity,scale] transition-discrete motion-reduce:transition-none data-[state=closed]:duration-150 data-[state=closed]:opacity-0 starting:opacity-0 data-[state=closed]:scale-95 starting:scale-95 duration-40 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg bg-[canvas] flex flex-col relative max-h-100 min-h-0 min-w-60 select-none overflow-hidden whitespace-nowrap">
          <div class="flex flex-col flex-1 min-h-0 overflow-y-auto p-1 bg-[canvas] overscroll-contain">
        <!-- QTI Interactions -->
        <div
          class="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none"
        >
          ${translateQti('slashMenu.interactions', { target: this })}
        </div>
        ${menuItems}
        ${canInsertGap ? html`
          <lit-editor-slash-menu-item
            class="contents"
            label=${translateQti('interactionInsert.gap', { target: this })}
            @select=${() => this.insertInteraction(insertGap)}
          ></lit-editor-slash-menu-item>
        ` : ''}

        <lit-editor-slash-menu-empty class="contents"></lit-editor-slash-menu-empty>

        <!-- Standard formatting options -->       
        <div
          class="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none"
        >
          ${translateQti('slashMenu.formatting', { target: this })}
        </div>
        <lit-editor-slash-menu-item
          class="contents"
          label="Text"
          @select=${() => commands.setParagraph?.()}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Heading 1"
          kbd="#"
          @select=${() => commands.setHeading?.({ level: 1 })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Heading 2"
          kbd="##"
          @select=${() => commands.setHeading?.({ level: 2 })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Heading 3"
          kbd="###"
          @select=${() => commands.setHeading?.({ level: 3 })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Bullet list"
          kbd="-"
          @select=${() => commands.wrapInList?.({ kind: 'bullet' })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Ordered list"
          kbd="1."
          @select=${() => commands.wrapInList?.({ kind: 'ordered' })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Task list"
          kbd="[]"
          @select=${() => commands.wrapInList?.({ kind: 'task' })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Toggle list"
          kbd=">>"
          @select=${() => commands.wrapInList?.({ kind: 'toggle' })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Quote"
          kbd=">"
          @select=${() => commands.setBlockquote?.()}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Table"
          @select=${() => commands.insertTable?.({ row: 3, col: 3 })}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Divider"
          kbd="---"
          @select=${() => commands.insertHorizontalRule?.()}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Code"
          kbd="\`\`\`"
          @select=${() => commands.setCodeBlock?.()}
        ></lit-editor-slash-menu-item>
        
        <lit-editor-slash-menu-empty class="contents"></lit-editor-slash-menu-empty>
          </div>
        </prosekit-autocomplete-popup>
      </prosekit-autocomplete-positioner>
    </prosekit-autocomplete-root>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-slash-menu': QtiSlashMenu;
  }
}
