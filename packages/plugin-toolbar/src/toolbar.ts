import 'prosekit/lit/popover';
import './button';
import './image-upload-popover';

import { html, LitElement, nothing } from 'lit';
import type { Editor } from 'prosekit/core';
import type { NodeType, Schema } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

interface ToolbarItem {
  isActive: boolean;
  canExec: boolean;
  command?: () => void;
}

interface QtiInsertItem {
  label: string;
  canInsert: boolean;
  command: () => void;
}

function canInsert(view: EditorView, nodeType: NodeType): boolean {
  const { $from } = view.state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const index = $from.index(d);
    if ($from.node(d).canReplaceWith(index, index, nodeType)) {
      return true;
    }
  }
  return false;
}

function getQtiItems(view: EditorView): QtiInsertItem[] {
  const schema: Schema = view.state.schema;
  const items: QtiInsertItem[] = [];

  if (schema.nodes.qtiChoiceInteraction) {
    const nodeType = schema.nodes.qtiChoiceInteraction;
    items.push({
      label: 'Choice Interaction',
      canInsert: canInsert(view, nodeType),
      command: () => {
        const s = schema;
        const node = nodeType.create(
          { responseIdentifier: `RESPONSE_${Date.now()}` },
          [
            s.nodes.qtiPrompt.create({}, s.nodes.paragraph.create({}, s.text('Enter your question here...'))),
            s.nodes.qtiSimpleChoice.create({ identifier: 'A' }, s.text('Option A')),
            s.nodes.qtiSimpleChoice.create({ identifier: 'B' }, s.text('Option B')),
          ]
        );
        view.dispatch(view.state.tr.replaceSelectionWith(node));
        view.focus();
      },
    });
  }

  if (schema.nodes.qtiTextEntryInteraction) {
    const nodeType = schema.nodes.qtiTextEntryInteraction;
    items.push({
      label: 'Text Entry',
      canInsert: canInsert(view, nodeType),
      command: () => {
        const node = nodeType.createAndFill({ responseIdentifier: `RESPONSE_${Date.now()}` });
        if (node) {
          view.dispatch(view.state.tr.replaceSelectionWith(node));
          view.focus();
        }
      },
    });
  }

  return items;
}

function getToolbarItems(editor: any): Record<string, ToolbarItem | undefined> {
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
    bold: editor.commands.toggleBold
      ? {
        isActive: editor.marks.bold.isActive(),
        canExec: editor.commands.toggleBold.canExec(),
        command: () => editor.commands.toggleBold(),
      }
      : undefined,
    italic: editor.commands.toggleItalic
      ? {
        isActive: editor.marks.italic.isActive(),
        canExec: editor.commands.toggleItalic.canExec(),
        command: () => editor.commands.toggleItalic(),
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
    bulletList: editor.commands.toggleList
      ? {
        isActive: editor.nodes.list.isActive({ kind: 'bullet' }),
        canExec: editor.commands.toggleList.canExec({ kind: 'bullet' }),
        command: () => editor.commands.toggleList({ kind: 'bullet' }),
      }
      : undefined,
    orderedList: editor.commands.toggleList
      ? {
        isActive: editor.nodes.list.isActive({ kind: 'ordered' }),
        canExec: editor.commands.toggleList.canExec({ kind: 'ordered' }),
        command: () => editor.commands.toggleList({ kind: 'ordered' }),
      }
      : undefined,
    taskList: editor.commands.toggleList
      ? {
        isActive: editor.nodes.list.isActive({ kind: 'task' }),
        canExec: editor.commands.toggleList.canExec({ kind: 'task' }),
        command: () => editor.commands.toggleList({ kind: 'task' }),
      }
      : undefined,
    toggleList: editor.commands.toggleList
      ? {
        isActive: editor.nodes.list.isActive({ kind: 'toggle' }),
        canExec: editor.commands.toggleList.canExec({ kind: 'toggle' }),
        command: () => editor.commands.toggleList({ kind: 'toggle' }),
      }
      : undefined,
    indentList: editor.commands.indentList
      ? {
        isActive: false,
        canExec: editor.commands.indentList.canExec(),
        command: () => editor.commands.indentList(),
      }
      : undefined,
    dedentList: editor.commands.dedentList
      ? {
        isActive: false,
        canExec: editor.commands.dedentList.canExec(),
        command: () => editor.commands.dedentList(),
      }
      : undefined,
    insertImage: editor.commands.insertImage
      ? {
        isActive: false,
        canExec: editor.commands.insertImage.canExec(),
      }
      : undefined,
  };
}

export class LitToolbar extends LitElement {
  static override properties = {
    editor: {
      attribute: false
    },
    uploader: {
      attribute: false
    },
  };

  declare editor: Editor | null;
  declare uploader: unknown;

  private qtiOpen = false;

  constructor() {
    super();
    this.editor = null;
    this.uploader = null;
  }

  private handleQtiOpenChange = (event: CustomEvent<boolean>) => {
    this.qtiOpen = event.detail;
    this.requestUpdate();
  };

  private handleQtiInsert(item: QtiInsertItem) {
    item.command();
    this.qtiOpen = false;
    this.requestUpdate();
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add('contents');
  }

  override render() {
    const editor = this.editor;
    if (!editor) {
      return nothing;
    }

    const items = getToolbarItems(editor);
    const view: EditorView | undefined = (editor as any).view;
    const qtiItems = view ? getQtiItems(view) : [];

    return html`
      <div class="z-2 sticky top-0 bg-white dark:bg-gray-950 box-border border-gray-200 dark:border-gray-800 border-solid border-l-0 border-r-0 border-t-0 border-b flex flex-wrap gap-1 p-2 items-center">
        ${
  items.undo
    ? html`
              <lit-editor-button
                .pressed=${items.undo.isActive}
                .disabled=${!items.undo.canExec}
                tooltip="Undo"
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
                tooltip="Redo"
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
                tooltip="Bold"
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
                tooltip="Italic"
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
                tooltip="Underline"
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
                tooltip="Strike"
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
                tooltip="Code"
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
                tooltip="Code Block"
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
                tooltip="Heading 1"
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
                tooltip="Heading 2"
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
                tooltip="Heading 3"
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
                tooltip="Divider"
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
                tooltip="Blockquote"
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
                tooltip="Bullet List"
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
                tooltip="Ordered List"
                icon="i-lucide-list-ordered size-5 block"
                @click=${items.orderedList.command}
              ></lit-editor-button>
            `
    : nothing
}
        ${
  items.taskList
    ? html`
              <lit-editor-button
                .pressed=${items.taskList.isActive}
                .disabled=${!items.taskList.canExec}
                tooltip="Task List"
                icon="i-lucide-list-checks size-5 block"
                @click=${items.taskList.command}
              ></lit-editor-button>
            `
    : nothing
}
        ${
  items.toggleList
    ? html`
              <lit-editor-button
                .pressed=${items.toggleList.isActive}
                .disabled=${!items.toggleList.canExec}
                tooltip="Toggle List"
                icon="i-lucide-list-collapse size-5 block"
                @click=${items.toggleList.command}
              ></lit-editor-button>
            `
    : nothing
}
        ${
  items.indentList
    ? html`
              <lit-editor-button
                .pressed=${items.indentList.isActive}
                .disabled=${!items.indentList.canExec}
                tooltip="Increase indentation"
                icon="i-lucide-indent-increase size-5 block"
                @click=${items.indentList.command}
              ></lit-editor-button>
            `
    : nothing
}
        ${
  items.dedentList
    ? html`
              <lit-editor-button
                .pressed=${items.dedentList.isActive}
                .disabled=${!items.dedentList.canExec}
                tooltip="Decrease indentation"
                icon="i-lucide-indent-decrease size-5 block"
                @click=${items.dedentList.command}
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
                tooltip="Insert Image"
                icon="i-lucide-image size-5 block"
              ></lit-editor-image-upload-popover>
            `
    : nothing
}
        ${
  qtiItems.length > 0
    ? html`
              <prosekit-popover-root
                .open=${this.qtiOpen}
                @open-change=${this.handleQtiOpenChange}
              >
                <prosekit-popover-trigger>
                  <lit-editor-button
                    .pressed=${this.qtiOpen}
                    .disabled=${!qtiItems.some(i => i.canInsert)}
                    tooltip="Insert QTI Interaction"
                    icon="i-lucide-plus size-5 block"
                  ></lit-editor-button>
                </prosekit-popover-trigger>
                <prosekit-popover-content class="flex flex-col gap-1 p-2 text-sm min-w-48 z-10 box-border rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg [&:not([data-state])]:hidden will-change-transform motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:animate-duration-150 motion-safe:data-[state=closed]:animate-duration-200">
                  ${qtiItems.map(item => html`
                    <button
                      class="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none border-0 bg-transparent cursor-pointer"
                      ?disabled=${!item.canInsert}
                      @mousedown=${(e: MouseEvent) => e.preventDefault()}
                      @click=${() => this.handleQtiInsert(item)}
                    >${item.label}</button>
                  `)}
                </prosekit-popover-content>
              </prosekit-popover-root>
            `
    : nothing
}
      </div>
    `;
  }
}

customElements.define('lit-editor-toolbar', LitToolbar);
