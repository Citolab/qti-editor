import 'prosekit/lit/autocomplete'

import { html, LitElement } from 'lit'
import { AutocompleteEmpty } from 'prosekit/lit/autocomplete';

// Explicitly register ProseKit autocomplete empty element
if (!customElements.get('prosekit-autocomplete-empty')) {
  customElements.define('prosekit-autocomplete-empty', AutocompleteEmpty);
}

class SlashMenuEmptyElement extends LitElement {
  createRenderRoot() {
    return this
  }

  render() {
    return html`
      <prosekit-autocomplete-empty class="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-gray-100 dark:data-focused:bg-gray-800">
        <span>No results</span>
      </prosekit-autocomplete-empty>
    `;
  }
}

customElements.define('lit-editor-slash-menu-empty', SlashMenuEmptyElement)
