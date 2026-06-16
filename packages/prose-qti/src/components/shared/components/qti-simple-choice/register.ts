import { QtiSimpleChoiceEdit } from './qti-simple-choice.js';

if (!customElements.get('qti-simple-choice')) {
  customElements.define('qti-simple-choice', QtiSimpleChoiceEdit);
}
