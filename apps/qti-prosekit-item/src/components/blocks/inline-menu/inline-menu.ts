import { ContextConsumer } from '@lit/context'
import { html, LitElement, nothing, type PropertyDeclaration, type PropertyValues } from 'lit'
import { defineUpdateHandler, type Editor } from 'prosekit/core'
import type { LinkAttrs } from 'prosekit/extensions/link'
import {
  registerInlinePopoverPopupElement,
  registerInlinePopoverPositionerElement,
  registerInlinePopoverRootElement,
  type OpenChangeEvent,
} from 'prosekit/lit/inline-popover'
import type { EditorState } from 'prosekit/pm/state'
import { editorContext } from '@citolab/prose-qti/integration/editor-context'

import '../button/index.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = Editor<any>

function getInlineMenuItems(editor: AnyEditor) {
  const commands = editor.commands as Record<string, { canExec: (...args: unknown[]) => boolean } & ((...args: unknown[]) => void)>
  const marks = editor.marks as Record<string, { isActive: () => boolean } | undefined>

  const bold = commands.toggleStrong ?? commands.toggleBold
  const italic = commands.toggleEm ?? commands.toggleItalic
  const boldMark = marks.strong ?? marks.bold
  const italicMark = marks.em ?? marks.italic

  return {
    bold: bold
      ? {
          isActive: boldMark?.isActive() ?? false,
          canExec: bold.canExec(),
          command: () => bold(),
        }
      : undefined,
    italic: italic
      ? {
          isActive: italicMark?.isActive() ?? false,
          canExec: italic.canExec(),
          command: () => italic(),
        }
      : undefined,
    underline: commands.toggleUnderline
      ? {
          isActive: marks.underline?.isActive() ?? false,
          canExec: commands.toggleUnderline.canExec(),
          command: () => commands.toggleUnderline(),
        }
      : undefined,
    strike: commands.toggleStrike
      ? {
          isActive: marks.strike?.isActive() ?? false,
          canExec: commands.toggleStrike.canExec(),
          command: () => commands.toggleStrike(),
        }
      : undefined,
    code: commands.toggleCode
      ? {
          isActive: marks.code?.isActive() ?? false,
          canExec: commands.toggleCode.canExec(),
          command: () => commands.toggleCode(),
        }
      : undefined,
    link: commands.addLink
      ? {
          isActive: marks.link?.isActive() ?? false,
          canExec: commands.addLink.canExec({ href: '' }),
          command: () => (commands.expandLink as () => void)(),
          currentLink: getCurrentLink(editor.state) || '',
        }
      : undefined,
  }
}

function getCurrentLink(state: EditorState): string | undefined {
  const { $from } = state.selection
  const marks = $from.marksAcross($from)
  if (!marks) {
    return
  }
  for (const mark of marks) {
    if (mark.type.name === 'link') {
      return (mark.attrs as LinkAttrs).href
    }
  }
}

const POSITIONER_CLASS =
  'block overflow-visible w-min h-min z-50 ease-out transition-transform duration-100 motion-reduce:transition-none'

const MAIN_POPUP_CLASS =
  'box-border origin-(--transform-origin) transition-[opacity,scale] transition-discrete motion-reduce:transition-none data-[state=closed]:duration-150 data-[state=closed]:opacity-0 starting:opacity-0 data-[state=closed]:scale-95 starting:scale-95 duration-40 border border-gray-200 dark:border-gray-800 shadow-lg bg-[canvas] relative flex min-w-32 space-x-1 overflow-auto whitespace-nowrap rounded-lg p-1'

const LINK_POPUP_CLASS =
  'box-border origin-(--transform-origin) transition-[opacity,scale] transition-discrete motion-reduce:transition-none data-[state=closed]:duration-150 data-[state=closed]:opacity-0 starting:opacity-0 data-[state=closed]:scale-95 starting:scale-95 duration-40 border border-gray-200 dark:border-gray-800 shadow-lg bg-[canvas] relative flex flex-col w-xs rounded-lg p-4 gap-y-2 items-stretch'

const LINK_POPUP_INPUT_CLASS =
  'flex h-9 rounded-md w-full bg-[canvas] px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-500 transition border box-border border-gray-200 dark:border-gray-800 border-solid ring-0 ring-transparent focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-0 outline-hidden focus-visible:outline-hidden file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50'

const LINK_POPUP_REMOVE_CLASS =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-0 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:bg-gray-900/90 dark:hover:bg-gray-50/90 h-9 px-3'

class LitInlineMenu extends LitElement {
  static override properties = {
    linkMenuOpen: { state: true, attribute: false } satisfies PropertyDeclaration<boolean>,
  }

  private linkMenuOpen = false

  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  })

  private removeUpdateExtension?: VoidFunction
  private attachedEditor?: Editor

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
    const editor = this.editorConsumer.value as AnyEditor | undefined
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

  private handleLinkUpdate(editor: AnyEditor, href?: string) {
    const commands = editor.commands as Record<string, (arg?: unknown) => void>
    if (href) {
      commands.addLink?.({ href })
    } else {
      commands.removeLink?.()
    }

    this.linkMenuOpen = false
    editor.focus()
  }

  override render() {
    const editor = this.editorConsumer.value as AnyEditor | undefined
    if (!editor) {
      return nothing
    }

    const items = getInlineMenuItems(editor)

    return html`
      <prosekit-inline-popover-root
        .editor=${editor}
        @openChange=${(event: OpenChangeEvent) => {
          if (!event.detail) {
            this.linkMenuOpen = false
          }
        }}
      >
        <prosekit-inline-popover-positioner class=${POSITIONER_CLASS}>
          <prosekit-inline-popover-popup
            data-testid="inline-menu-main"
            class=${MAIN_POPUP_CLASS}
          >
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
                    tooltip="Strikethrough"
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
            ${items.link && items.link.canExec
              ? html`
                  <lit-editor-button
                    .pressed=${items.link.isActive}
                    tooltip="Link"
                    icon="i-lucide-link size-5 block"
                    @click=${() => {
                      items.link?.command?.()
                      this.linkMenuOpen = !this.linkMenuOpen
                    }}
                  ></lit-editor-button>
                `
              : nothing}
          </prosekit-inline-popover-popup>
        </prosekit-inline-popover-positioner>
      </prosekit-inline-popover-root>

      ${items.link
        ? html`
            <prosekit-inline-popover-root
              .editor=${editor}
              .defaultOpen=${false}
              .open=${this.linkMenuOpen}
              @openChange=${(event: OpenChangeEvent) => {
                this.linkMenuOpen = event.detail
              }}
            >
              <prosekit-inline-popover-positioner placement="bottom" class=${POSITIONER_CLASS}>
                <prosekit-inline-popover-popup
                  data-testid="inline-menu-link"
                  class=${LINK_POPUP_CLASS}
                >
                  ${this.linkMenuOpen
                    ? html`
                        <form
                          @submit=${(event: SubmitEvent) => {
                            event.preventDefault()
                            const target = event.target as HTMLFormElement | null
                            const href = target?.querySelector('input')?.value?.trim()
                            this.handleLinkUpdate(editor, href)
                          }}
                        >
                          <input
                            placeholder="Paste the link..."
                            value=${items.link.currentLink}
                            class=${LINK_POPUP_INPUT_CLASS}
                          />
                        </form>
                      `
                    : nothing}
                  ${items.link.isActive
                    ? html`
                        <button
                          @click=${() => this.handleLinkUpdate(editor)}
                          @mousedown=${(event: MouseEvent) => event.preventDefault()}
                          class=${LINK_POPUP_REMOVE_CLASS}
                        >
                          Remove link
                        </button>
                      `
                    : nothing}
                </prosekit-inline-popover-popup>
              </prosekit-inline-popover-positioner>
            </prosekit-inline-popover-root>
          `
        : nothing}
    `
  }
}

export function registerLitEditorInlineMenu() {
  registerInlinePopoverRootElement()
  registerInlinePopoverPositionerElement()
  registerInlinePopoverPopupElement()

  if (customElements.get('lit-editor-inline-menu')) return
  customElements.define('lit-editor-inline-menu', LitInlineMenu)
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-editor-inline-menu': LitInlineMenu
  }
}
