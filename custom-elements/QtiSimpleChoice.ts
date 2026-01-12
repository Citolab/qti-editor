import { ConsumerMixin } from '@open-wc/context-protocol';

interface InteractionContext {
  enabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

// QTI Simple Choice Element
// Based on 1EdTech QTI specification: https://www.imsglobal.org/spec/qti/v3p0
export class QtiSimpleChoice extends ConsumerMixin(HTMLElement) {
  #identifier = '';
  #selected = false;
  #fixed = false;
  #disabled = false;
  #readonly = true; // Start in readonly mode by default
  #interactionType: 'radio' | 'checkbox' = 'radio';

  // Context protocol - consume interaction context
  contexts = {
    'qti-interaction-context': (context: InteractionContext) => {
      this.handleContextUpdate(context);
    }
  };

  constructor() {
    super();
    this.attachStyles();
  }

  static get observedAttributes() {
    return ['identifier', 'selected', 'fixed', 'disabled', 'readonly'];
  }

  get identifier() {
    return this.#identifier;
  }

  set identifier(value: string) {
    this.#identifier = value;
    this.setAttribute('identifier', value);
  }

  get selected() {
    return this.#selected;
  }

  set selected(value: boolean) {
    this.#selected = value;
    if (value) {
      this.setAttribute('selected', '');
    } else {
      this.removeAttribute('selected');
    }
  }

  get fixed() {
    return this.#fixed;
  }

  set fixed(value: boolean) {
    this.#fixed = value;
    if (value) {
      this.setAttribute('fixed', '');
    } else {
      this.removeAttribute('fixed');
    }
  }

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
    this.updateState();
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
    this.updateState();
  }



  // Enable/disable interaction
  enable() {
    this.readonly = false;
    this.disabled = false;
  }

  disable() {
    this.readonly = true;
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    switch (name) {
      case 'identifier':
        this.#identifier = newValue || '';
        this.updateRadioButton();
        break;
      case 'selected':
        this.#selected = newValue !== null;
        this.updateRadioButton();
        break;
      case 'fixed':
        this.#fixed = newValue !== null;
        break;
      case 'disabled':
        this.#disabled = newValue !== null;
        this.updateState();
        break;
      case 'readonly':
        this.#readonly = newValue !== null;
        this.updateState();
        break;
    }
  }

  connectedCallback() {
    super.connectedCallback(); // Important: call parent for context protocol
    this.createAnchoredRadioButton();
    this.updateState();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeAnchoredRadioButton();
    this.removeEventListeners();
  }

  private handleContextUpdate(context: InteractionContext) {
    // Sync local state with context - use direct property setting to avoid setter issues
    if (context.enabled) {
      this.#readonly = false;
      this.#disabled = false;
      this.removeAttribute('readonly');
      this.removeAttribute('disabled');
    } else {
      this.#readonly = true;
      this.setAttribute('readonly', '');
    }
    // Force update of the input element
    this.updateRadioButton();
  }

  setInteractionType(type: 'radio' | 'checkbox') {
    if (this.#interactionType !== type) {
      this.#interactionType = type;
      this.updateRadioButton(); // Recreate the input element with new type
    }
  }

  private setupEventListeners() {
    this.addEventListener('click', this.handleClick.bind(this));
    this.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private removeEventListeners() {
    this.removeEventListener('click', this.handleClick.bind(this));
    this.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleClick(event: Event) {
    if (this.#disabled || this.#readonly || this.#fixed) {
      event.preventDefault();
      return;
    }
    this.toggleSelection();
  }

  private handleKeydown(event: KeyboardEvent) {
    if (this.#disabled || this.#readonly) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggleSelection();
    }
  }

  private toggleSelection() {
    if (this.#interactionType === 'radio') {
      if (!this.#selected) {
        this.selectChoice();
      }
    } else {
      // Checkbox behavior - can toggle
      if (this.#selected) {
        this.deselectChoice();
      } else {
        this.selectChoice();
      }
    }
  }

  private deselectChoice() {
    this.selected = false;
    this.dispatchSelectionEvent();
  }

  private updateState() {
    // Update visual state
    this.setAttribute('aria-disabled', this.#disabled.toString());
    this.setAttribute('aria-readonly', this.#readonly.toString());
    this.tabIndex = this.#disabled ? -1 : 0;
    
    // Update radio button state
    this.updateRadioButton();
  }

  private createAnchoredRadioButton() {
    this.updateRadioButton();
  }

  private updateRadioButton() {
    // Remove existing radio button
    this.removeAnchoredRadioButton();
    
    // Determine if this should be radio or checkbox based on parent interaction
    const choiceInteraction = this.closest('qti-choice-interaction');
    const maxChoices = choiceInteraction ? parseInt(choiceInteraction.getAttribute('max-choices') || '1') : 1;
    this.#interactionType = maxChoices > 1 ? 'checkbox' : 'radio';
    
    // Create input element outside ProseMirror's DOM
    const inputElement = document.createElement('input');
    inputElement.type = this.#interactionType;
    inputElement.name = this.getChoiceInteractionId();
    inputElement.value = this.identifier;
    inputElement.checked = this.selected;
    inputElement.disabled = this.#disabled; // Only disabled state affects input, not readonly
    inputElement.className = 'qti-choice-input';
    
    // Check if CSS anchor positioning is supported
    const supportsAnchorPositioning = CSS.supports('anchor-name', '--test');
    
    if (supportsAnchorPositioning) {
      // Use CSS anchor positioning
      const anchorName = `--choice-${this.identifier || Math.random().toString(36).substr(2, 9)}`;
      this.style.anchorName = anchorName;
      
      inputElement.style.position = 'absolute';
      inputElement.style.positionAnchor = anchorName;
      inputElement.style.left = 'anchor(left)';
      inputElement.style.top = 'anchor(center)';
      inputElement.style.transform = 'translate(-24px, -50%)';
      inputElement.style.zIndex = '10';
      inputElement.style.pointerEvents = this.#disabled ? 'none' : 'auto';
      
      // Visual feedback for interaction state
      if (this.#disabled) {
        inputElement.style.opacity = '0.5';
        inputElement.style.cursor = 'not-allowed';
      } else {
        inputElement.style.opacity = '1';
        inputElement.style.cursor = 'pointer';
      }
      
      // Add readonly visual indicator without disabling input
      if (this.#readonly) {
        inputElement.style.border = '2px solid #fbbf24';
        inputElement.style.backgroundColor = '#fef3c7';
      }
      
      // Add to document body
      document.body.appendChild(inputElement);
    } else {
      // Fallback to manual positioning
      inputElement.style.position = 'absolute';
      inputElement.style.zIndex = '10';
      inputElement.style.pointerEvents = this.#disabled ? 'none' : 'auto';
      
      // Visual feedback for interaction state
      if (this.#disabled) {
        inputElement.style.opacity = '0.5';
        inputElement.style.cursor = 'not-allowed';
      } else {
        inputElement.style.opacity = '1';
        inputElement.style.cursor = 'pointer';
      }
      
      // Add readonly visual indicator without disabling input
      if (this.#readonly) {
        inputElement.style.border = '2px solid #fbbf24';
        inputElement.style.backgroundColor = '#fef3c7';
      }
      
      // Add to document body
      document.body.appendChild(inputElement);
      
      // Update position manually
      this.updateInputPosition();
      window.addEventListener('scroll', this.updateInputPosition.bind(this));
      window.addEventListener('resize', this.updateInputPosition.bind(this));
    }
    
    // Store reference for cleanup
    (this as any)._inputElement = inputElement;
    (this as any)._usesAnchorPositioning = supportsAnchorPositioning;
    
    // Add event listener for state changes
    inputElement.addEventListener('change', (e) => {
      if (!this.#disabled) {
        const target = e.target as HTMLInputElement;
        if (this.#interactionType === 'checkbox') {
          // For checkboxes, toggle selection based on checked state
          this.selected = target.checked;
          this.dispatchSelectionEvent();
        } else {
          // For radio buttons, only select if checked
          if (target.checked) {
            this.selectChoice();
          }
        }
      } else {
        // Prevent state change if disabled
        e.preventDefault();
        (e.target as HTMLInputElement).checked = this.selected;
      }
    });
  }

  private removeAnchoredRadioButton() {
    const inputElement = (this as any)._inputElement;
    const usesAnchorPositioning = (this as any)._usesAnchorPositioning;
    
    if (inputElement && inputElement.parentNode) {
      inputElement.parentNode.removeChild(inputElement);
      (this as any)._inputElement = null;
    }
    
    if (usesAnchorPositioning) {
      // Clear anchor name
      this.style.anchorName = '';
    } else {
      // Remove fallback event listeners
      window.removeEventListener('scroll', this.updateInputPosition.bind(this));
      window.removeEventListener('resize', this.updateInputPosition.bind(this));
    }
    
    (this as any)._usesAnchorPositioning = null;
  }

  private updateInputPosition() {
    // Fallback positioning method for browsers without anchor support
    const inputElement = (this as any)._inputElement;
    if (!inputElement) return;
    
    const rect = this.getBoundingClientRect();
    inputElement.style.left = (rect.left + window.scrollX - 20) + 'px';
    inputElement.style.top = (rect.top + window.scrollY + rect.height / 2) + 'px';
    inputElement.style.transform = 'translateY(-50%)';
  }

  private getChoiceInteractionId(): string {
    const choiceInteraction = this.closest('qti-choice-interaction');
    const responseId = choiceInteraction?.getAttribute('response-identifier');
    const maxChoices = choiceInteraction ? parseInt(choiceInteraction.getAttribute('max-choices') || '1') : 1;
    
    // For radio buttons, use the response-identifier as group name
    // For checkboxes, each should have unique name or no name grouping
    if (maxChoices === 1) {
      return responseId || 'radio-group-' + Math.random().toString(36).substr(2, 9);
    } else {
      return this.identifier || 'checkbox-' + Math.random().toString(36).substr(2, 9);
    }
  }

  private selectChoice() {
    // Select this choice
    this.selected = true;
    this.dispatchSelectionEvent();
  }

  private dispatchSelectionEvent() {
    // Dispatch event
    this.dispatchEvent(new CustomEvent('choice-selected', {
      detail: {
        identifier: this.identifier,
        selected: this.selected
      },
      bubbles: true,
      composed: true
    }));
  }

  // Uncomment to enable click handling
  // private _handleClick(e: Event) {
  //   if (!this.fixed) {
  //     this.selected = !this.selected;
  //     this.dispatchEvent(new CustomEvent('choice-selected', {
  //       detail: {
  //         identifier: this.identifier,
  //         selected: this.selected
  //       },
  //       bubbles: true,
  //       composed: true
  //     }));
  //   }
  // }

  private attachStyles() {
    const style = document.createElement('style');
    style.textContent = `
      qti-simple-choice {
        display: block;
        padding: 12px 16px 12px 32px;
        margin: 4px 0;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        background-color: #fff;
        outline: none;
        min-height: 44px;
        display: flex;
        align-items: center;
      }
      
      qti-simple-choice:hover:not([disabled]):not([readonly]) {
        background-color: #f8f9fa;
        border-color: #dee2e6;
      }
      
      qti-simple-choice:focus {
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }
      
      qti-simple-choice[selected] {
        background-color: #e7f3ff;
        border-color: #007bff;
      }
      
      qti-simple-choice[selected]:hover:not([disabled]) {
        background-color: #cce7ff;
      }
      
      qti-simple-choice[disabled] {
        background-color: #f8f9fa;
        border-color: #e9ecef;
        color: #6c757d;
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      qti-simple-choice[readonly] {
        background-color: #f8f9fa;
        cursor: default;
      }
      
      qti-simple-choice[readonly]:not([selected]) {
        opacity: 0.8;
      }
      
      .qti-choice-radio {
        width: 18px;
        height: 18px;
        margin: 0;
        cursor: pointer;
        accent-color: #007bff;
      }
      
      .qti-choice-radio:disabled {
        cursor: not-allowed;
      }
      
      /* CSS Anchor positioning support */
      @supports (anchor-name: --test) {
        .qti-choice-radio {
          position-try-options: flip-block;
        }
      }
      
      /* Fallback for browsers without anchor positioning */
      @supports not (anchor-name: --test) {
        .qti-choice-radio {
          /* Manual positioning as fallback */
        }
      }
    `;
    document.head.appendChild(style);
  }
}

customElements.define('qti-simple-choice', QtiSimpleChoice);

declare global {
  interface HTMLElementTagNameMap {
    'qti-simple-choice': QtiSimpleChoice;
  }
}