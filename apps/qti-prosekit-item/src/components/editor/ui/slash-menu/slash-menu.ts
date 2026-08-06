import { ContextConsumer } from '@lit/context'
import { html, LitElement } from 'lit'
import type { BasicExtension } from 'prosekit/basic'
import type { Editor } from 'prosekit/core'
import { canUseRegexLookbehind } from 'prosekit/core'
import {
  registerAutocompleteEmptyElement,
  registerAutocompleteItemElement,
  registerAutocompletePopupElement,
  registerAutocompletePositionerElement,
  registerAutocompleteRootElement,
} from 'prosekit/lit/autocomplete'
import { listInsertableInteractionDescriptors } from '../../../../extensions/qti-extension.ts'

import { editorContext } from '../editor-context.ts'

import { SlashMenuEmptyElement } from './slash-menu-empty.ts'
import { SlashMenuItemElement } from './slash-menu-item.ts'

// Match inputs like "/", "/table", "/heading 1" etc. Do not match "/ heading".
const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u

class SlashMenuElement extends LitElement {
  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  })

  override createRenderRoot() {
    return this
  }

  override render() {
    const editor = this.editorConsumer.value as Editor<BasicExtension> | undefined
    if (!editor) {
      return html``
    }

    const view = (editor as any).view
    const schema = view?.state?.schema

    const prettyLabel = (tagName: string) =>
      tagName
        .replace(/^qti-/, '')
        .replace(/-interaction$/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase())

    const items = view
      ? listInsertableInteractionDescriptors()
          .filter(descriptor => {
            const nodeType = schema?.nodes?.[descriptor.nodeTypeName]
            return Boolean(nodeType)
          })
          .map(descriptor => ({
            descriptor,
            label: prettyLabel(descriptor.tagName),
            canInsert: descriptor.insertCommand(view.state, undefined, view),
          }))
      : []

    return html`<prosekit-autocomplete-root .editor=${editor} .regex=${regex}>
      <prosekit-autocomplete-positioner class="block overflow-visible w-min h-min z-50 ease-out transition-transform duration-100 motion-reduce:transition-none">
        <prosekit-autocomplete-popup class="box-border origin-(--transform-origin) transition-[opacity,scale] transition-discrete motion-reduce:transition-none data-[state=closed]:duration-150 data-[state=closed]:opacity-0 starting:opacity-0 data-[state=closed]:scale-95 starting:scale-95 duration-40 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg bg-[canvas] flex flex-col relative max-h-100 min-h-0 min-w-60 select-none overflow-hidden whitespace-nowrap">
          <div class="flex flex-col flex-1 min-h-0 overflow-y-auto p-1 bg-[canvas] overscroll-contain">
            ${items.map(
              ({ descriptor, label, canInsert }) => html`<lit-editor-slash-menu-item
                class="contents"
                .label=${label}
                ?disabled=${!canInsert}
                @select=${() => {
                  if (!view) return
                  descriptor.insertCommand(view.state, view.dispatch, view)
                  view.focus()
                }}
              ></lit-editor-slash-menu-item>`,
            )}
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
