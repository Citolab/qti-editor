import { QtiGapTextEdit } from './qti-gap-text.js';

if (!customElements.get('qti-gap-text')) {
  customElements.define('qti-gap-text', QtiGapTextEdit);
}
