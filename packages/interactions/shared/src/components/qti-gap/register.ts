import { QtiGapEdit } from './qti-gap.js';

if (!customElements.get('qti-gap')) {
  customElements.define('qti-gap', QtiGapEdit);
}
