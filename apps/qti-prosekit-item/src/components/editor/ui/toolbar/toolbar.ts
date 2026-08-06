import { ContextConsumer } from '@lit/context'
import { html, LitElement, nothing, type PropertyDeclaration, type PropertyValues } from 'lit'
import { defineUpdateHandler } from 'prosekit/core'
import type { Uploader } from 'prosekit/extensions/file'
import '@citolab/prose-qti-ui/components/interaction-insert-menu'
import '../../../blocks/convert-menu/index.ts'

import { registerLitEditorButton } from '../button/index.ts'
import { editorContext } from '@citolab/prose-qti-ui/editor-context'
import { registerLitEditorImageUploadPopover } from '../image-upload-popover/index.ts'

function getToolbarItems(editor: any) {
  const toggleBold = editor.commands.toggleBold ?? editor.commands.toggleStrong
  const toggleItalic = editor.commands.toggleItalic ?? editor.commands.toggleEm

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
    bold: toggleBold
      ? {
          isActive: editor.marks.bold?.isActive() ?? editor.marks.strong?.isActive() ?? false,
          canExec: toggleBold.canExec(),
          command: () => toggleBold(),
        }
      : undefined,
    italic: toggleItalic
      ? {
          isActive: editor.marks.italic?.isActive() ?? editor.marks.em?.isActive() ?? false,
          canExec: toggleItalic.canExec(),
          command: () => toggleItalic(),
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
          isActive: editor.nodes.bullet_list?.isActive() ?? false,
          canExec: editor.commands.toggleBulletList.canExec(),
          command: () => editor.commands.toggleBulletList(),
        }
      : undefined,
    orderedList: editor.commands.toggleOrderedList
      ? {
          isActive: editor.nodes.ordered_list?.isActive() ?? false,
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
  }
}

class LitToolbar extends LitElement {
  static override properties = {
    uploader: { attribute: false } satisfies PropertyDeclaration<Uploader<string>>,
  }

  uploader?: Uploader<string>

  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  })

  private removeUpdateExtension?: VoidFunction
  private attachedEditor?: any

  override createRenderRoot() {
    return this
  }

  override connectedCallback() {
    super.connectedCallback()
    this.classList.add('contents')
    this.attachEditorListener()
  }

  override disconnectedCallback() {
    this.detachEditorListener()
    super.disconnectedCallback()
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties)
    this.attachEditorListener()
  }

  private attachEditorListener() {
    const editor = this.editorConsumer.value as any
    if (editor === this.attachedEditor) return

    this.detachEditorListener()
    this.attachedEditor = editor

    if (!editor) return

    this.removeUpdateExtension = editor.use(defineUpdateHandler(() => this.requestUpdate()))
  }

  private detachEditorListener() {
    this.removeUpdateExtension?.()
    this.removeUpdateExtension = undefined
    this.attachedEditor = undefined
  }

  override render() {
    const editor = this.editorConsumer.value as any
    if (!editor) {
      return nothing
    }

    const items = getToolbarItems(editor)

    return html`
      <div class="z-2 box-border border-gray-200 dark:border-gray-800 border-solid border-l-0 border-r-0 border-t-0 border-b flex flex-wrap gap-1 p-2 items-center">
        <qti-interaction-insert-menu .editor=${editor}></qti-interaction-insert-menu>
        <qti-convert-menu .editor=${editor}></qti-convert-menu>
        ${items.undo
          ? html`
              <lit-editor-button
                .pressed=${items.undo.isActive}
                .disabled=${!items.undo.canExec}
                tooltip="Undo"
                icon="i-lucide-undo-2 size-5 block"
                @click=${items.undo.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.redo
          ? html`
              <lit-editor-button
                .pressed=${items.redo.isActive}
                .disabled=${!items.redo.canExec}
                tooltip="Redo"
                icon="i-lucide-redo-2 size-5 block"
                @click=${items.redo.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.bold
          ? html`
              <lit-editor-button
                .pressed=${items.bold.isActive}
                .disabled=${!items.bold.canExec}
                tooltip="Bold"
                icon="i-lucide-bold size-5 block"
                @click=${items.bold.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.italic
          ? html`
              <lit-editor-button
                .pressed=${items.italic.isActive}
                .disabled=${!items.italic.canExec}
                tooltip="Italic"
                icon="i-lucide-italic size-5 block"
                @click=${items.italic.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.underline
          ? html`
              <lit-editor-button
                .pressed=${items.underline.isActive}
                .disabled=${!items.underline.canExec}
                tooltip="Underline"
                icon="i-lucide-underline size-5 block"
                @click=${items.underline.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.strike
          ? html`
              <lit-editor-button
                .pressed=${items.strike.isActive}
                .disabled=${!items.strike.canExec}
                tooltip="Strike"
                icon="i-lucide-strikethrough size-5 block"
                @click=${items.strike.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.code
          ? html`
              <lit-editor-button
                .pressed=${items.code.isActive}
                .disabled=${!items.code.canExec}
                tooltip="Code"
                icon="i-lucide-code size-5 block"
                @click=${items.code.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.codeBlock
          ? html`
              <lit-editor-button
                .pressed=${items.codeBlock.isActive}
                .disabled=${!items.codeBlock.canExec}
                tooltip="Code Block"
                icon="i-lucide-square-code size-5 block"
                @click=${items.codeBlock.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.heading1
          ? html`
              <lit-editor-button
                .pressed=${items.heading1.isActive}
                .disabled=${!items.heading1.canExec}
                tooltip="Heading 1"
                icon="i-lucide-heading-1 size-5 block"
                @click=${items.heading1.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.heading2
          ? html`
              <lit-editor-button
                .pressed=${items.heading2.isActive}
                .disabled=${!items.heading2.canExec}
                tooltip="Heading 2"
                icon="i-lucide-heading-2 size-5 block"
                @click=${items.heading2.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.heading3
          ? html`
              <lit-editor-button
                .pressed=${items.heading3.isActive}
                .disabled=${!items.heading3.canExec}
                tooltip="Heading 3"
                icon="i-lucide-heading-3 size-5 block"
                @click=${items.heading3.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.horizontalRule
          ? html`
              <lit-editor-button
                .pressed=${items.horizontalRule.isActive}
                .disabled=${!items.horizontalRule.canExec}
                tooltip="Divider"
                icon="i-lucide-minus size-5 block"
                @click=${items.horizontalRule.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.blockquote
          ? html`
              <lit-editor-button
                .pressed=${items.blockquote.isActive}
                .disabled=${!items.blockquote.canExec}
                tooltip="Blockquote"
                icon="i-lucide-text-quote size-5 block"
                @click=${items.blockquote.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.bulletList
          ? html`
              <lit-editor-button
                .pressed=${items.bulletList.isActive}
                .disabled=${!items.bulletList.canExec}
                tooltip="Bullet List"
                icon="i-lucide-list size-5 block"
                @click=${items.bulletList.command}
              ></lit-editor-button>
            `
          : nothing}
        ${items.orderedList
          ? html`
              <lit-editor-button
                .pressed=${items.orderedList.isActive}
                .disabled=${!items.orderedList.canExec}
                tooltip="Ordered List"
                icon="i-lucide-list-ordered size-5 block"
                @click=${items.orderedList.command}
              ></lit-editor-button>
            `
          : nothing}
        ${this.uploader && items.insertImage
          ? html`
              <lit-editor-image-upload-popover
                .editor=${editor}
                .uploader=${this.uploader}
                .disabled=${!items.insertImage.canExec}
                tooltip="Insert Image"
                icon="i-lucide-image size-5 block"
              ></lit-editor-image-upload-popover>
            `
          : nothing}
      </div>
    `
  }
}

export function registerLitEditorToolbar() {
  registerLitEditorButton()
  registerLitEditorImageUploadPopover()

  if (customElements.get('lit-editor-toolbar')) return
  customElements.define('lit-editor-toolbar', LitToolbar)
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-editor-toolbar': LitToolbar
  }
}
