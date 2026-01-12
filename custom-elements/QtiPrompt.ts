// QTI Prompt Element
// Based on 1EdTech QTI specification: https://www.imsglobal.org/spec/qti/v3p0
export class QtiPrompt extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      const wrapper = document.createElement('div');
      wrapper.className = 'wrapper';

      const slot = document.createElement('slot');
      wrapper.appendChild(slot);

      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
        }
        .wrapper {
          display: block;
        }
      `;

      shadow.append(style, wrapper);
    }

    // Force element into event chain to stabilize selection across shadow boundary
    this.addEventListener('mouseenter', () => {});
  }
}

customElements.define('qti-prompt', QtiPrompt);

declare global {
  interface HTMLElementTagNameMap {
    'qti-prompt': QtiPrompt;
  }
}


// export class QtiPrompt extends HTMLElement {
//   constructor() {
//     super();
//     this.attachStyles();
//   }

//   connectedCallback() {
//     // Content is already in the light DOM, no need to add slot
//   }

//   private attachStyles() {
//     const style = document.createElement('style');
//     style.textContent = `
//       qti-prompt {
//         display: block;
//       }
//     `;
//     document.head.appendChild(style);
//   }
// }