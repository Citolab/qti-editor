import { ConsumerMixin } from '@open-wc/context-protocol';

interface InteractionContext {
  enabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

// QTI Choice Interaction Element
// Based on 1EdTech QTI specification: https://www.imsglobal.org/spec/qti/v3p0
// Implements custom form element according to HTML specification
/**
 * Choice interaction container.
 * @pmNode block
 * @pmGroup block
 * @pmContent qti_prompt? qti_simple_choice+
 * @pmDefining true
 * @pmIsolating true
 * @pmToolbar true
 * @pmLabel Multiple Choice
 * @pmIcon ☑️
 * @pmKeywords choice,quiz,mcq,select,multiple
 * @pmCategory interaction
 * @pmInsertable true
 */
export class QtiChoiceInteraction extends ConsumerMixin(HTMLElement) {
  #debug = false; // Set to true for debug logging
  #responseIdentifier = '';
  #shuffle = false;
  #maxChoices = 1;
  #minChoices = 0;
  #disabled = false;
  #readonly = true; // Start in readonly mode by default
  #required = false;
  #value: string[] = [];
  #internals: ElementInternals;

  // Form-associated custom element
  static formAssociated = true;

  // Context protocol - consume interaction context
  contexts = {
    'qti-interaction-context': (context: InteractionContext) => {
      this.handleContextUpdate(context);
    },
  };

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.attachStyles();
  }

  static get observedAttributes() {
    return [
      'response-identifier', 'shuffle', 'max-choices', 'min-choices',
      'disabled', 'readonly', 'required', 'enabled',
    ];
  }

  // QTI-specific properties
  get responseIdentifier() {
    return this.#responseIdentifier;
  }

  set responseIdentifier(value: string) {
    this.#responseIdentifier = value;
    this.setAttribute('response-identifier', value);
  }

  get shuffle() {
    return this.#shuffle;
  }

  set shuffle(value: boolean) {
    this.#shuffle = value;
    if (value) {
      this.setAttribute('shuffle', '');
    } else {
      this.removeAttribute('shuffle');
    }
  }

  get maxChoices() {
    return this.#maxChoices;
  }

  set maxChoices(value: number) {
    this.#maxChoices = value;
    this.setAttribute('max-choices', value.toString());
    void this.updateChoicesType();
  }

  get minChoices() {
    return this.#minChoices;
  }

  set minChoices(value: number) {
    this.#minChoices = value;
    this.setAttribute('min-choices', value.toString());
  }

  // Form element properties
  get disabled() {
    return this.#disabled;
  }

  set disabled(value: boolean) {
    this.#disabled = value;
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
    this.updateFormState();
    void this.updateChoicesState();
  }

  get readonly() {
    return this.#readonly;
  }

  set readonly(value: boolean) {
    this.#readonly = value;
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
    void this.updateChoicesState();
  }

  get required() {
    return this.#required;
  }

  set required(value: boolean) {
    this.#required = value;
    if (value) {
      this.setAttribute('required', '');
    } else {
      this.removeAttribute('required');
    }
    this.updateFormState();
  }

  get value() {
    return this.#value.length === 1 && this.#maxChoices === 1
      ? this.#value[0]
      : this.#value;
  }

  set value(val: string | string[]) {
    const newValue = Array.isArray(val) ? val : [val].filter(Boolean);
    this.#value = newValue;
    this.updateFormState();
    void this.syncChoicesWithValue();
  }

  // Enable/disable the interaction (QTI-specific)
  enable() {
    this.#readonly = false;
    this.#disabled = false;
    this.removeAttribute('readonly');
    this.removeAttribute('disabled');
    if (!this.hasAttribute('enabled')) {
      this.setAttribute('enabled', '');
    }
    this.updateFormState();
    void this.updateChoicesState();
  }

  disable() {
    this.#readonly = true;
    this.setAttribute('readonly', '');
    this.removeAttribute('enabled');
    this.updateFormState();
    void this.updateChoicesState();
  }

  // Form API implementation
  get form() {
    return this.#internals.form;
  }

  get name() {
    return this.getAttribute('name') || this.#responseIdentifier;
  }

  get type() {
    return this.#maxChoices === 1 ? 'radio' : 'checkbox';
  }

  get validity() {
    return this.#internals.validity;
  }

  get validationMessage() {
    return this.#internals.validationMessage;
  }

  checkValidity() {
    return this.#internals.checkValidity();
  }

  reportValidity() {
    return this.#internals.reportValidity();
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    switch (name) {
      case 'response-identifier':
        this.#responseIdentifier = newValue || '';
        break;
      case 'shuffle':
        this.#shuffle = newValue !== null;
        if (this.#shuffle) {
          this.shuffleChoices();
        }
        break;
      case 'max-choices':
        this.#maxChoices = parseInt(newValue) || 1;
        this.updateChoicesType();
        break;
      case 'min-choices':
        this.#minChoices = parseInt(newValue) || 0;
        break;
      case 'disabled':
        this.#disabled = newValue !== null;
        this.updateFormState();
        void this.updateChoicesState();
        break;
      case 'readonly':
        this.#readonly = newValue !== null;
        void this.updateChoicesState();
        break;
      case 'required':
        this.#required = newValue !== null;
        this.updateFormState();
        break;
      case 'enabled':
        // Only update internal state, don't call enable() to avoid loops
        if (newValue !== null && this.#readonly) {
          this.#readonly = false;
          this.#disabled = false;
          this.updateFormState();
          void this.updateChoicesState();
        }
        break;
    }
  }

  connectedCallback() {
    super.connectedCallback?.(); // Important: call parent for context protocol
    this.setupEventListeners();
    void this.updateChoicesType();
    this.updateFormState();
    void this.updateChoicesState();

    if (this.#shuffle) {
      this.shuffleChoices();
    }
  }

  private handleContextUpdate(context: InteractionContext) {
    if (this.#debug) {
      console.log('QtiChoiceInteraction: Context update received', {
        enabled: context.enabled,
        interactionId: this.getAttribute('response-identifier'),
      });
    }

    // Sync local state with context
    if (context.enabled) {
      this.enable();
    } else {
      this.disable();
    }
  }

  setDebugMode(enabled: boolean) {
    this.#debug = enabled;
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  private readonly onChoiceSelected = (event: Event) => {
    this.handleChoiceSelected(event as CustomEvent);
  };

  private setupEventListeners() {
    this.addEventListener('choice-selected', this.onChoiceSelected);
  }

  private removeEventListeners() {
    this.removeEventListener('choice-selected', this.onChoiceSelected);
  }

  private handleChoiceSelected(event: CustomEvent) {
    if (this.#disabled || this.#readonly) {
      event.preventDefault();
      return;
    }

    const { identifier, selected } = event.detail;

    if (this.#maxChoices === 1) {
      // Single selection (radio behavior)
      this.#value = selected ? [identifier] : [];
      this.clearOtherChoices(identifier);
    } else {
      // Multiple selection (checkbox behavior)
      if (selected) {
        if (!this.#value.includes(identifier)) {
          if (this.#value.length < this.#maxChoices) {
            this.#value.push(identifier);
          } else {
            // Max choices reached, prevent selection
            event.preventDefault();
            this.showMaxChoicesMessage();
            return;
          }
        }
      } else {
        this.#value = this.#value.filter(id => id !== identifier);
      }
    }

    this.updateFormState();
    this.dispatchChangeEvent();
  }

  private clearOtherChoices(selectedIdentifier: string) {
    const choices = this.querySelectorAll('qti-simple-choice');
    choices.forEach(choice => {
      if (choice.getAttribute('identifier') !== selectedIdentifier) {
        (choice as any).selected = false;
      }
    });
  }

  private async syncChoicesWithValue() {
    await customElements.whenDefined('qti-simple-choice');
    const choices = this.querySelectorAll('qti-simple-choice');
    choices.forEach(choice => {
      const identifier = choice.getAttribute('identifier');
      (choice as any).selected = identifier && this.#value.includes(identifier);
    });
  }

  private async updateChoicesType() {
    // Wait for qti-simple-choice elements to be defined
    await customElements.whenDefined('qti-simple-choice');

    const choices = this.querySelectorAll('qti-simple-choice');
    choices.forEach(choice => {
      if (typeof (choice as any).setInteractionType === 'function') {
        (choice as any).setInteractionType(this.#maxChoices === 1 ? 'radio' : 'checkbox');
      }
    });
  }

  private async updateChoicesState() {
    await customElements.whenDefined('qti-simple-choice');
    const choices = this.querySelectorAll('qti-simple-choice');
    choices.forEach(choice => {
      (choice as any).disabled = this.#disabled;
      (choice as any).readonly = this.#readonly;
    });
  }

  private shuffleChoices() {
    const choices = Array.from(this.querySelectorAll('qti-simple-choice'));
    const nonFixed = choices.filter(choice => !choice.hasAttribute('fixed'));
    const fixed = choices.filter(choice => choice.hasAttribute('fixed'));

    // Shuffle non-fixed choices
    for (let i = nonFixed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonFixed[i], nonFixed[j]] = [nonFixed[j], nonFixed[i]];
    }

    // Rebuild the order preserving fixed positions
    const shuffled = [...choices];
    let nonFixedIndex = 0;

    shuffled.forEach((choice, index) => {
      if (!choice.hasAttribute('fixed') && nonFixedIndex < nonFixed.length) {
        if (shuffled[index] !== nonFixed[nonFixedIndex]) {
          this.insertBefore(nonFixed[nonFixedIndex], shuffled[index]);
        }
        nonFixedIndex++;
      }
    });
  }

  private updateFormState() {
    const isValid = this.validateResponse();

    if (isValid) {
      this.#internals.setValidity({});
    } else {
      this.#internals.setValidity(
        { valueMissing: this.#required && this.#value.length === 0,
          rangeUnderflow: this.#value.length < this.#minChoices,
          rangeOverflow: this.#value.length > this.#maxChoices,
        },
        this.getValidationMessage(),
      );
    }

    // Set form data
    const formData = new FormData();
    if (this.name) {
      if (this.#maxChoices === 1) {
        if (this.#value.length > 0) {
          formData.append(this.name, this.#value[0]);
        }
      } else {
        this.#value.forEach(value => {
          formData.append(this.name, value);
        });
      }
    }
    this.#internals.setFormValue(formData);
  }

  private validateResponse(): boolean {
    if (this.#required && this.#value.length === 0) {
      return false;
    }
    if (this.#value.length < this.#minChoices) {
      return false;
    }
    if (this.#value.length > this.#maxChoices) {
      return false;
    }
    return true;
  }

  private getValidationMessage(): string {
    if (this.#required && this.#value.length === 0) {
      return 'Please select at least one option.';
    }
    if (this.#value.length < this.#minChoices) {
      return `Please select at least ${this.#minChoices} option${this.#minChoices > 1 ? 's' : ''}.`;
    }
    if (this.#value.length > this.#maxChoices) {
      return `Please select no more than ${this.#maxChoices} option${this.#maxChoices > 1 ? 's' : ''}.`;
    }
    return '';
  }

  private showMaxChoicesMessage() {
    const message = this.getAttribute('data-max-selections-message') ||
      `You may select no more than ${this.#maxChoices} option${this.#maxChoices > 1 ? 's' : ''}.`;

    // Dispatch custom event for UI to handle
    this.dispatchEvent(new CustomEvent('max-choices-exceeded', {
      detail: { message, maxChoices: this.#maxChoices },
      bubbles: true,
    }));
  }

  private dispatchChangeEvent() {
    this.dispatchEvent(new Event('change', { bubbles: true }));
    this.dispatchEvent(new CustomEvent('qti-response-changed', {
      detail: {
        responseIdentifier: this.#responseIdentifier,
        value: this.value,
      },
      bubbles: true,
    }));
  }

  // Public API for response processing
  getResponse(): string | string[] {
    return this.value;
  }

  setResponse(value: string | string[]) {
    this.value = value;
  }

  clearResponse() {
    this.value = [];
  }

  private attachStyles() {
    const style = document.createElement('style');
    style.textContent = `
      qti-choice-interaction {
        display: block;
        border: 1px solid #ccc;
        padding: 16px;
        margin: 8px 0;
        border-radius: 8px;
        background-color: #fff;
        transition: all 0.2s ease;
      }
      
      qti-choice-interaction[readonly] {
        background-color: #f8f9fa;
        border-color: #e9ecef;
      }
      
      qti-choice-interaction[disabled] {
        background-color: #f8f9fa;
        border-color: #e9ecef;
        opacity: 0.6;
        pointer-events: none;
      }
      
      qti-choice-interaction[enabled] {
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
      }
      
      qti-choice-interaction:invalid {
        border-color: #dc3545;
        background-color: #fff5f5;
      }
      
      qti-choice-interaction:valid {
        border-color: #28a745;
      }
    `;
    document.head.appendChild(style);
  }
}

customElements.define('qti-choice-interaction', QtiChoiceInteraction);

declare global {
  interface HTMLElementTagNameMap {
    'qti-choice-interaction': QtiChoiceInteraction;
  }
}
