import { ContextConsumer } from '@lit/context'
import { html, LitElement, nothing } from 'lit'
import type { Editor } from 'prosekit/core'
import { canUseRegexLookbehind } from 'prosekit/core'
import {
  registerAutocompleteEmptyElement,
  registerAutocompleteItemElement,
  registerAutocompletePopupElement,
  registerAutocompletePositionerElement,
  registerAutocompleteRootElement,
} from 'prosekit/lit/autocomplete'
import { editorContext } from '@citolab/prose-qti-ui/editor-context'

import { SlashMenuEmptyElement } from './slash-menu-empty'
import { SlashMenuItemElement } from './slash-menu-item'

// Match inputs like "/", "/table", "/heading 1" etc. Do not match "/ heading".
const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u

const POSITIONER_CLASS =
  'block overflow-visible w-min h-min z-50 ease-out transition-transform duration-100 motion-reduce:transition-none'

const POPUP_CLASS =
  'box-border origin-(--transform-origin) transition-[opacity,scale] transition-discrete motion-reduce:transition-none data-[state=closed]:duration-150 data-[state=closed]:opacity-0 starting:opacity-0 data-[state=closed]:scale-95 starting:scale-95 duration-40 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg bg-[canvas] flex flex-col relative max-h-100 min-h-0 min-w-60 select-none overflow-hidden whitespace-nowrap'

const POPUP_CONTENT_CLASS =
  'flex flex-col flex-1 min-h-0 overflow-y-auto p-1 bg-[canvas] overscroll-contain'

class SlashMenuElement extends LitElement {
  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  })

  override createRenderRoot() {
    return this
  }

  override render() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = this.editorConsumer.value as Editor<any> | undefined
    if (!editor) {
      return html``
    }

    const commands = editor.commands as Record<string, ((...args: unknown[]) => void) | undefined>
    const has = (name: string) => typeof commands[name] === 'function'

    return html`<prosekit-autocomplete-root .editor=${editor} .regex=${regex}>
      <prosekit-autocomplete-positioner class=${POSITIONER_CLASS}>
        <prosekit-autocomplete-popup class=${POPUP_CLASS}>
          <div class=${POPUP_CONTENT_CLASS}>
            ${has('setParagraph')
              ? html`<lit-editor-slash-menu-item
                  class="contents"
                  label="Text"
                  @select=${() => commands.setParagraph?.()}
                ></lit-editor-slash-menu-item>`
              : nothing}
            ${has('setHeading')
              ? html`<lit-editor-slash-menu-item
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
                  ></lit-editor-slash-menu-item>`
              : nothing}
            ${has('wrapInList')
              ? html`<lit-editor-slash-menu-item
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
                  ></lit-editor-slash-menu-item>`
              : nothing}
            ${has('setBlockquote')
              ? html`<lit-editor-slash-menu-item
                  class="contents"
                  label="Quote"
                  kbd=">"
                  @select=${() => commands.setBlockquote?.()}
                ></lit-editor-slash-menu-item>`
              : nothing}
            ${has('insertTable')
              ? html`<lit-editor-slash-menu-item
                  class="contents"
                  label="Table"
                  @select=${() => commands.insertTable?.({ row: 3, col: 3 })}
                ></lit-editor-slash-menu-item>`
              : nothing}
            ${has('insertHorizontalRule')
              ? html`<lit-editor-slash-menu-item
                  class="contents"
                  label="Divider"
                  kbd="---"
                  @select=${() => commands.insertHorizontalRule?.()}
                ></lit-editor-slash-menu-item>`
              : nothing}
            ${has('setCodeBlock')
              ? html`<lit-editor-slash-menu-item
                  class="contents"
                  label="Code"
                  kbd="\`\`\`"
                  @select=${() => commands.setCodeBlock?.()}
                ></lit-editor-slash-menu-item>`
              : nothing}
            <lit-editor-slash-menu-empty class="contents"></lit-editor-slash-menu-empty>
          </div>
        </prosekit-autocomplete-popup>
      </prosekit-autocomplete-positioner>
    </prosekit-autocomplete-root>`
  }
}

export function registerLitEditorSlashMenu() {
  registerAutocompleteEmptyElement()
  registerAutocompleteItemElement()
  registerAutocompletePopupElement()
  registerAutocompletePositionerElement()
  registerAutocompleteRootElement()

  if (!customElements.get('lit-editor-slash-menu-item')) {
    customElements.define('lit-editor-slash-menu-item', SlashMenuItemElement)
  }
  if (!customElements.get('lit-editor-slash-menu-empty')) {
    customElements.define('lit-editor-slash-menu-empty', SlashMenuEmptyElement)
  }
  if (customElements.get('lit-editor-slash-menu')) return
  customElements.define('lit-editor-slash-menu', SlashMenuElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-editor-slash-menu': SlashMenuElement
    'lit-editor-slash-menu-item': SlashMenuItemElement
    'lit-editor-slash-menu-empty': SlashMenuEmptyElement
  }
}
