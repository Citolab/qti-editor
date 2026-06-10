import { QtiSimpleMatchSetEdit } from './qti-simple-match-set.js';

if (!customElements.get('qti-simple-match-set')) {
  customElements.define('qti-simple-match-set', QtiSimpleMatchSetEdit);
}
