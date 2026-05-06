/* eslint-disable lit/attribute-value-entities */
/**
 * QTI Slash Menu
 *
 * App-level slash menu that extends the default prosekit slash menu with
 * QTI interaction insert commands (Choice, Extended Text, Text Entry).
 *
 * This component uses ProseKit autocomplete primitives and adds
 * QTI-specific items in a separate group.
 */

import 'prosekit/lit/autocomplete';
import '@qti-editor/ui/components/slash-menu/slash-menu-item.js';
import '@qti-editor/ui/components/slash-menu/slash-menu-empty.js';

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { canUseRegexLookbehind, type Editor } from 'prosekit/core';
import { translateQti } from '@qti-editor/interaction-shared';
import { insertAssociateInteraction } from '@qti-editor/interaction-associate';
import { insertGapMatchInteraction } from '@qti-editor/interaction-gap-match';
import { insertChoiceInteraction } from '@qti-editor/interaction-choice';
import { insertExtendedTextInteraction } from '@qti-editor/interaction-extended-text';
import { insertHottextInteraction } from '@qti-editor/interaction-hottext';
import { insertMatchInteraction } from '@qti-editor/interaction-match';
import { insertOrderInteraction } from '@qti-editor/interaction-order';
import { insertSelectPointInteraction } from '@qti-editor/interaction-select-point';

import type { EditorView } from 'prosekit/pm/view';

const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u;

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

  private insertInteraction(command: (state: any, dispatch: any, view?: EditorView) => boolean) {
    const view = this.getView();
    if (!view) return;
    command(view.state, view.dispatch, view);
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
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.choice', { target: this })}
          @select=${() => this.insertInteraction(insertChoiceInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.extendedText', { target: this })}
          @select=${() => this.insertInteraction(insertExtendedTextInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.textEntry', { target: this })}
          @select=${() => this.insertTextEntry()}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.hottext', { target: this })}
          @select=${() => this.insertInteraction(insertHottextInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.associate', { target: this })}
          @select=${() => this.insertInteraction(insertAssociateInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.match', { target: this })}
          @select=${() => this.insertInteraction(insertMatchInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.order', { target: this })}
          @select=${() => this.insertInteraction(insertOrderInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.selectPoint', { target: this })}
          @select=${() => this.insertInteraction(insertSelectPointInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-item
          class="contents"
          label=${translateQti('interactionInsert.gapMatch', { target: this })}
          @select=${() => this.insertInteraction(insertGapMatchInteraction)}
        ></lit-editor-slash-menu-item>
        <lit-editor-slash-menu-empty class="contents"></lit-editor-slash-menu-empty>

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
