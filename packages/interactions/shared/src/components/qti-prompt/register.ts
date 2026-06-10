import { QtiPromptEdit } from './qti-prompt.js';

if (!customElements.get('qti-prompt')) {
  customElements.define('qti-prompt', QtiPromptEdit);
}
