import { html, LitElement } from 'lit'

const ITEM_CLASS =
  'relative flex items-center justify-between min-w-32 scroll-my-1 rounded-md px-3 py-1.5 text-sm box-border cursor-default select-none whitespace-nowrap outline-hidden data-highlighted:bg-gray-100 dark:data-highlighted:bg-gray-800'

export class SlashMenuEmptyElement extends LitElement {
  override createRenderRoot() {
    return this
  }

  override render() {
    return html`
      <prosekit-autocomplete-empty class=${ITEM_CLASS}>
        <span>No results</span>
      </prosekit-autocomplete-empty>
    `
  }
}
