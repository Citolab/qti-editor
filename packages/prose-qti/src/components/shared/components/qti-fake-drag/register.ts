import { QtiFakeDrag } from './qti-fake-drag.js';

if (!customElements.get('qti-fake-drag')) {
  customElements.define('qti-fake-drag', QtiFakeDrag);
}
