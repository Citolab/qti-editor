// Minimal text entry interaction with shadow DOM to test NodeView interop
/**
 * Inline text entry interaction.
 * @pmNode inline
 * @pmGroup inline
 * @pmAtom true
 * @pmSelectable true
 * @pmMarks _
 * @pmToolbar true
 * @pmLabel Text Entry
 * @pmIcon 📝
 * @pmKeywords text,input,blank,fill,entry
 * @pmCategory interaction
 * @pmInsertable true
 */
export class QtiTextEntryInteraction extends HTMLElement {
  #input?: HTMLInputElement;

  static get observedAttributes() {
    return ['response-identifier'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';

    const label = document.createElement('label');
    label.textContent = this.getAttribute('response-identifier') || 'RESPONSE';
    label.className = 'label';

    this.#input = document.createElement('input');
    this.#input.type = 'text';
    this.#input.placeholder = 'Enter text...';
    this.#input.className = 'input';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .wrapper {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: #f8fafc;
      }
      .label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .input {
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 6px 8px;
        font-size: 14px;
        outline: none;
      }
      .input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
      }
    `;

    wrapper.append(label, this.#input);
    shadow.append(style, wrapper);
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'response-identifier') {
      this.updateLabel(value || 'RESPONSE');
    }
  }

  private updateLabel(text: string) {
    const label = this.shadowRoot?.querySelector('.label');
    if (label) label.textContent = text;
  }
}

customElements.define('qti-text-entry-interaction', QtiTextEntryInteraction);
