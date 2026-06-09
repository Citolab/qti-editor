import '../button/index'
import '../image-upload-popover/index'
import '../interaction-insert-menu/index.ts'
import '../convert-menu/index.ts'

import { html, LitElement, nothing } from 'lit';
import { ContextConsumer } from '@lit/context';
import { defineUpdateHandler } from 'prosekit/core';
import { subscribeQtiI18n, translateQti } from '@qti-editor/interactions/shared';

import { editorContext } from '../editor-context';

function getToolbarItems(editor) {
  return {
    undo: editor.commands.undo
      ? {
          isActive: false,
          canExec: editor.commands.undo.canExec(),
          command: () => editor.commands.undo(),
        }
      : undefined,
    redo: editor.commands.redo
      ? {
          isActive: false,
          canExec: editor.commands.redo.canExec(),
          command: () => editor.commands.redo(),
        }
      : undefined,
    bold: editor.commands.toggleStrong
      ? {
          isActive: editor.marks.strong.isActive(),
          canExec: editor.commands.toggleStrong.canExec(),
          command: () => editor.commands.toggleStrong(),
        }
      : undefined,
    italic: editor.commands.toggleEm
      ? {
          isActive: editor.marks.em.isActive(),
          canExec: editor.commands.toggleEm.canExec(),
          command: () => editor.commands.toggleEm(),
        }
      : undefined,
    underline: editor.commands.toggleUnderline
      ? {
          isActive: editor.marks.underline.isActive(),
          canExec: editor.commands.toggleUnderline.canExec(),
          command: () => editor.commands.toggleUnderline(),
        }
      : undefined,
    strike: editor.commands.toggleStrike
      ? {
          isActive: editor.marks.strike.isActive(),
          canExec: editor.commands.toggleStrike.canExec(),
          command: () => editor.commands.toggleStrike(),
        }
      : undefined,
    code: editor.commands.toggleCode
      ? {
          isActive: editor.marks.code.isActive(),
          canExec: editor.commands.toggleCode.canExec(),
          command: () => editor.commands.toggleCode(),
        }
      : undefined,
    codeBlock: editor.commands.insertCodeBlock
      ? {
          isActive: editor.nodes.codeBlock.isActive(),
          canExec: editor.commands.insertCodeBlock.canExec({ language: 'javascript' }),
          command: () => editor.commands.insertCodeBlock({ language: 'javascript' }),
        }
      : undefined,
    heading1: editor.commands.toggleHeading
      ? {
          isActive: editor.nodes.heading.isActive({ level: 1 }),
          canExec: editor.commands.toggleHeading.canExec({ level: 1 }),
          command: () => editor.commands.toggleHeading({ level: 1 }),
        }
      : undefined,
    heading2: editor.commands.toggleHeading
      ? {
          isActive: editor.nodes.heading.isActive({ level: 2 }),
          canExec: editor.commands.toggleHeading.canExec({ level: 2 }),
          command: () => editor.commands.toggleHeading({ level: 2 }),
        }
      : undefined,
    heading3: editor.commands.toggleHeading
      ? {
          isActive: editor.nodes.heading.isActive({ level: 3 }),
          canExec: editor.commands.toggleHeading.canExec({ level: 3 }),
          command: () => editor.commands.toggleHeading({ level: 3 }),
        }
      : undefined,
    horizontalRule: editor.commands.insertHorizontalRule
      ? {
          isActive: editor.nodes.horizontalRule.isActive(),
          canExec: editor.commands.insertHorizontalRule.canExec(),
          command: () => editor.commands.insertHorizontalRule(),
        }
      : undefined,
    blockquote: editor.commands.toggleBlockquote
      ? {
          isActive: editor.nodes.blockquote.isActive(),
          canExec: editor.commands.toggleBlockquote.canExec(),
          command: () => editor.commands.toggleBlockquote(),
        }
      : undefined,
    bulletList: editor.commands.toggleBulletList
      ? {
          isActive: editor.nodes.bullet_list.isActive(),
          canExec: editor.commands.toggleBulletList.canExec(),
          command: () => editor.commands.toggleBulletList(),
        }
      : undefined,
    orderedList: editor.commands.toggleOrderedList
      ? {
          isActive: editor.nodes.ordered_list.isActive(),
          canExec: editor.commands.toggleOrderedList.canExec(),
          command: () => editor.commands.toggleOrderedList(),
        }
      : undefined,
    insertImage: editor.commands.insertImage
      ? {
          isActive: false,
          canExec: editor.commands.insertImage.canExec(),
        }
      : undefined,
    insertTable: editor.commands.insertTable
      ? {
          isActive: false,
          canExec: editor.commands.insertTable.canExec({ row: 3, col: 3 }),
          command: () => editor.commands.insertTable({ row: 3, col: 3 }),
        }
      : undefined,
  };
}

class LitToolbar extends LitElement {
  static properties = {
    editor: {
      attribute: false
    },
    uploader: {
      attribute: false
    },
    labels: {
      attribute: false
    },
  };

  createRenderRoot() {
    return this
  }

  editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  });

  get resolvedEditor() {
    return this.editor ?? this.editorConsumer.value
  }

  connectedCallback() {
    super.connectedCallback()
    this.removeI18nListener = subscribeQtiI18n(() => this.requestUpdate())
    this.attachEditorListener()
  }

  disconnectedCallback() {
    this.removeI18nListener?.()
    this.removeI18nListener = undefined
    this.detachEditorListener()
    super.disconnectedCallback()
  }

  updated(changedProperties) {
    super.updated(changedProperties)

    this.attachEditorListener()
  }

  attachEditorListener() {
    const editor = this.resolvedEditor
    if (editor === this.attachedEditor) return

    this.detachEditorListener()
    this.attachedEditor = editor

    if (!editor) return

    this.removeUpdateExtension = editor.use(defineUpdateHandler(() => this.requestUpdate()))
  }

  detachEditorListener() {
    this.removeUpdateExtension?.()
    this.removeUpdateExtension = undefined
    this.attachedEditor = undefined
  }

  t(key, fallback) {
    return this.labels?.[key] ?? translateQti(key, { target: this, fallback })
  }

  render() {
    const editor = this.resolvedEditor
    if (!editor) {
      return nothing
    }

    const items = getToolbarItems(editor)

    return html`
      <div class="z-2 box-border border-gray-200 dark:border-gray-800 border-solid border-l-0 border-r-0 border-t-0 border-b flex flex-wrap gap-1 p-2 px-4 items-center">
        <qti-interaction-insert-menu .editor=${editor}></qti-interaction-insert-menu>
        <qti-convert-menu .editor=${editor}></qti-convert-menu>
        ${
          items.undo
            ? html`
              <lit-editor-button
                .pressed=${items.undo.isActive}
                .disabled=${!items.undo.canExec}
                .tooltip=${this.t('toolbar.undo', 'Undo')}
                icon="i-lucide-undo-2 size-5 block"
                @click=${items.undo.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.redo
            ? html`
              <lit-editor-button
                .pressed=${items.redo.isActive}
                .disabled=${!items.redo.canExec}
                .tooltip=${this.t('toolbar.redo', 'Redo')}
                icon="i-lucide-redo-2 size-5 block"
                @click=${items.redo.command}
              ></lit-editor-button>
            `
            : nothing
        }

        ${
          items.bold
            ? html`
              <lit-editor-button
                .pressed=${items.bold.isActive}
                .disabled=${!items.bold.canExec}
                .tooltip=${this.t('toolbar.bold', 'Bold')}
                icon="i-lucide-bold size-5 block"
                @click=${items.bold.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.italic
            ? html`
              <lit-editor-button
                .pressed=${items.italic.isActive}
                .disabled=${!items.italic.canExec}
                .tooltip=${this.t('toolbar.italic', 'Italic')}
                icon="i-lucide-italic size-5 block"
                @click=${items.italic.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.underline
            ? html`
              <lit-editor-button
                .pressed=${items.underline.isActive}
                .disabled=${!items.underline.canExec}
                .tooltip=${this.t('toolbar.underline', 'Underline')}
                icon="i-lucide-underline size-5 block"
                @click=${items.underline.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.strike
            ? html`
              <lit-editor-button
                .pressed=${items.strike.isActive}
                .disabled=${!items.strike.canExec}
                .tooltip=${this.t('toolbar.strike', 'Strike')}
                icon="i-lucide-strikethrough size-5 block"
                @click=${items.strike.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.code
            ? html`
              <lit-editor-button
                .pressed=${items.code.isActive}
                .disabled=${!items.code.canExec}
                .tooltip=${this.t('toolbar.code', 'Code')}
                icon="i-lucide-code size-5 block"
                @click=${items.code.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.codeBlock
            ? html`
              <lit-editor-button
                .pressed=${items.codeBlock.isActive}
                .disabled=${!items.codeBlock.canExec}
                .tooltip=${this.t('toolbar.codeBlock', 'Code Block')}
                icon="i-lucide-square-code size-5 block"
                @click=${items.codeBlock.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.heading1
            ? html`
              <lit-editor-button
                .pressed=${items.heading1.isActive}
                .disabled=${!items.heading1.canExec}
                .tooltip=${this.t('toolbar.heading1', 'Heading 1')}
                icon="i-lucide-heading-1 size-5 block"
                @click=${items.heading1.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.heading2
            ? html`
              <lit-editor-button
                .pressed=${items.heading2.isActive}
                .disabled=${!items.heading2.canExec}
                .tooltip=${this.t('toolbar.heading2', 'Heading 2')}
                icon="i-lucide-heading-2 size-5 block"
                @click=${items.heading2.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.heading3
            ? html`
              <lit-editor-button
                .pressed=${items.heading3.isActive}
                .disabled=${!items.heading3.canExec}
                .tooltip=${this.t('toolbar.heading3', 'Heading 3')}
                icon="i-lucide-heading-3 size-5 block"
                @click=${items.heading3.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.horizontalRule
            ? html`
              <lit-editor-button
                .pressed=${items.horizontalRule.isActive}
                .disabled=${!items.horizontalRule.canExec}
                .tooltip=${this.t('toolbar.divider', 'Divider')}
                icon="i-lucide-minus size-5 block"
                @click=${items.horizontalRule.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.blockquote
            ? html`
              <lit-editor-button
                .pressed=${items.blockquote.isActive}
                .disabled=${!items.blockquote.canExec}
                .tooltip=${this.t('toolbar.blockquote', 'Blockquote')}
                icon="i-lucide-text-quote size-5 block"
                @click=${items.blockquote.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.bulletList
            ? html`
              <lit-editor-button
                .pressed=${items.bulletList.isActive}
                .disabled=${!items.bulletList.canExec}
                .tooltip=${this.t('toolbar.bulletList', 'Bullet List')}
                icon="i-lucide-list size-5 block"
                @click=${items.bulletList.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          items.orderedList
            ? html`
              <lit-editor-button
                .pressed=${items.orderedList.isActive}
                .disabled=${!items.orderedList.canExec}
                .tooltip=${this.t('toolbar.orderedList', 'Ordered List')}
                icon="i-lucide-list-ordered size-5 block"
                @click=${items.orderedList.command}
              ></lit-editor-button>
            `
            : nothing
        }
        ${
          this.uploader && items.insertImage
            ? html`
              <lit-editor-image-upload-popover
                .editor=${editor}
                .uploader=${this.uploader}
                .disabled=${!items.insertImage.canExec}
                .tooltip=${this.t('toolbar.insertImage', 'Insert Image')}
                .labels=${this.labels}
                icon="i-lucide-image size-5 block"
              ></lit-editor-image-upload-popover>
            `
            : nothing
        }
        ${
          items.insertTable
            ? html`
              <lit-editor-button
                .pressed=${items.insertTable.isActive}
                .disabled=${!items.insertTable.canExec}
                .tooltip=${this.t('toolbar.insertTable', 'Insert Table')}
                icon="i-lucide-table size-5 block"
                @click=${items.insertTable.command}
              ></lit-editor-button>
            `
            : nothing
        }
      </div>
    `;
  }
}

customElements.define('lit-editor-toolbar', LitToolbar)
