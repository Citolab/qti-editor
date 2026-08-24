/* eslint-disable lit/attribute-value-entities */
/**
 * QTI Slash Menu
 *
 * App-level slash menu that dynamically loads QTI interactions from the descriptor registry.
 * Uses the descriptor pattern to automatically populate the slash menu with all registered interactions.
 */

import {
  registerAutocompleteEmptyElement,
  registerAutocompleteItemElement,
  registerAutocompletePopupElement,
  registerAutocompletePositionerElement,
  registerAutocompleteRootElement,
} from 'prosekit/lit/autocomplete';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { canUseRegexLookbehind, type Editor } from 'prosekit/core';
import { listInteractionDescriptors } from '@citolab/prose-qti/core/interactions/composer';
import { subscribeQtiI18n, translateQti } from '@citolab/prose-qti/components/shared';
import { insertGap } from '@citolab/prose-qti/components/gap-match';

import { insertItemDivider } from '../../item-divider/qti-item-divider.commands.js';
import './slash-menu-item.js';
import './slash-menu-empty.js';

import type { EditorView } from 'prosekit/pm/view';

registerAutocompleteRootElement();
registerAutocompletePositionerElement();
registerAutocompletePopupElement();
registerAutocompleteItemElement();
registerAutocompleteEmptyElement();

const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u;

/**
 * Map ProseMirror node type names to i18n keys.
 *
 * Keyed by `nodeTypeName`, not `tagName`, because the tag is not unique: the drag-drop and tabular
 * match variants are both `<qti-match-interaction>` and are told apart only by the
 * `qti-match-tabular` class, so a tag-keyed map collapsed them into one entry and whichever
 * descriptor came second was silently unreachable. The node type is the discriminator the schema
 * itself uses.
 *
 * Membership here is also what decides whether an interaction appears in this menu at all, so an
 * interaction that gains an `insertCommand` still needs a line added below.
 */
const NODE_TYPE_TO_I18N_KEY: Record<string, string> = {
  qtiChoiceInteraction: 'interactionInsert.choice',
  qtiExtendedTextInteraction: 'interactionInsert.extendedText',
  qtiTextEntryInteraction: 'interactionInsert.textEntry',
  qtiInlineChoiceInteraction: 'interactionInsert.inlineChoice',
  qtiHottextInteraction: 'interactionInsert.hottext',
  qtiMatchInteraction: 'interactionInsert.match',
  qtiMatchInteractionTabular: 'interactionInsert.matchTabular',
  qtiOrderInteraction: 'interactionInsert.order',
  qtiSelectPointInteraction: 'interactionInsert.selectPoint',
  qtiGapMatchInteraction: 'interactionInsert.gapMatch',
  qtiRubricBlock: 'interactionInsert.rubricBlock',
  // qti-item-divider has its own static slash-menu entry below — the divider
  // node lives locally in this app and is not part of the descriptor registry.
};

@customElement('qti-slash-menu')
export class QtiSlashMenu extends LitElement {
  @property({ attribute: false })
  editor: Editor | null = null;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  private removeI18nListener?: () => void;

  override createRenderRoot() {
    return this;
  }

  /*
   * Every label in this menu goes through `translateQti`, which reads the registry at RENDER time —
   * so without a subscription the labels are whatever the language was on first render and a later
   * switch never reaches them. The toolbar has subscribed all along; this menu had not, so its
   * labels silently froze. Same two lines, same reason.
   */
  override connectedCallback(): void {
    super.connectedCallback();
    this.removeI18nListener = subscribeQtiI18n(() => this.requestUpdate());
  }

  override disconnectedCallback(): void {
    this.removeI18nListener?.();
    this.removeI18nListener = undefined;
    super.disconnectedCallback();
  }

  private getView(): EditorView | null {
    return (this.editor as any)?.view ?? null;
  }

  private runAfterAutocompleteCleanup(callback: () => void) {
    queueMicrotask(callback);
  }

  private insertInteraction(insertCommand: any) {
    this.runAfterAutocompleteCleanup(() => {
      const view = this.getView();
      if (!view) return;
      insertCommand(view.state, view.dispatch, view);
      view.focus();
    });
  }

  private runEditorCommand(callback: () => void) {
    this.runAfterAutocompleteCleanup(() => {
      callback();
      this.getView()?.focus();
    });
  }

  override render() {
    const editor = this.editor;
    if (!editor) return html``;

    // Get all registered interaction descriptors
    const descriptors = listInteractionDescriptors();
    
    // Build menu items array before rendering
    const menuItems = descriptors
      .filter(d => d.insertCommand && NODE_TYPE_TO_I18N_KEY[d.nodeTypeName])
      .map(descriptor => {
        const i18nKey = NODE_TYPE_TO_I18N_KEY[descriptor.nodeTypeName];
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
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.itemDivider', { target: this })}
          @select=${() => this.insertInteraction(insertItemDivider)}
        ></lit-editor-slash-menu-item>
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
          @select=${() => this.runEditorCommand(() => commands.setParagraph?.())}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Heading 1"
          kbd="#"
          @select=${() => this.runEditorCommand(() => commands.setHeading?.({ level: 1 }))}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Heading 2"
          kbd="##"
          @select=${() => this.runEditorCommand(() => commands.setHeading?.({ level: 2 }))}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Heading 3"
          kbd="###"
          @select=${() => this.runEditorCommand(() => commands.setHeading?.({ level: 3 }))}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Bullet list"
          kbd="-"
          @select=${() => this.runEditorCommand(() => commands.toggleBulletList?.())}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Ordered list"
          kbd="1."
          @select=${() => this.runEditorCommand(() => commands.toggleOrderedList?.())}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Quote"
          kbd=">"
          @select=${() => this.runEditorCommand(() => commands.setBlockquote?.())}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Table"
          @select=${() => this.runEditorCommand(() => commands.insertTable?.({ row: 3, col: 3 }))}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Divider"
          kbd="---"
          @select=${() => this.runEditorCommand(() => commands.insertHorizontalRule?.())}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label="Code"
          kbd="\`\`\`"
          @select=${() => this.runEditorCommand(() => commands.setCodeBlock?.())}
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
