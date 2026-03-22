import 'prosekit/lit/autocomplete'

import { html, LitElement } from 'lit'

class SlashMenuItemElement extends LitElement {
  static properties = {
    label: { type: String },
    kbd: { type: String },
  };

  constructor() {
    super()
    this.label = ''
    this.kbd = ''
  }

  createRenderRoot() {
    return this
  }

  handleSelect = (event) => {
    this.dispatchEvent(new CustomEvent('select', { detail: event.detail }))
  }

  render() {
    return html`<prosekit-autocomplete-item
      @select=${this.handleSelect}
      class="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-gray-100 dark:data-focused:bg-gray-800"
    >
      <span>${this.label}</span>
      ${this.kbd ? html`<kbd class="text-xs font-mono text-gray-400 dark:text-gray-500">${this.kbd}</kbd>` : ''}
    </prosekit-autocomplete-item>`;
  }
}

customElements.define('lit-editor-slash-menu-item', SlashMenuItemElement)
