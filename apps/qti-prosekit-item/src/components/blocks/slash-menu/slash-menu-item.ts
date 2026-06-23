import { html, LitElement } from 'lit'

const ITEM_CLASS =
  'relative flex items-center justify-between min-w-32 scroll-my-1 rounded-md px-3 py-1.5 text-sm box-border cursor-default select-none whitespace-nowrap outline-hidden data-highlighted:bg-gray-100 dark:data-highlighted:bg-gray-800'

const KBD_CLASS = 'text-xs font-mono text-gray-400 dark:text-gray-500'

export class SlashMenuItemElement extends LitElement {
  static override properties = {
    label: { type: String },
    kbd: { type: String },
  }

  label: string
  kbd: string

  constructor() {
    super()
    this.label = ''
    this.kbd = ''
  }

  override createRenderRoot() {
    return this
  }

  handleSelect = () => {
    this.dispatchEvent(new CustomEvent('select'))
  }

  override render() {
    return html`<prosekit-autocomplete-item @select=${this.handleSelect} class=${ITEM_CLASS}>
      <span>${this.label}</span>${this.kbd
        ? html`<kbd class=${KBD_CLASS}>${this.kbd}</kbd>`
        : ''}
    </prosekit-autocomplete-item>`
  }
}
