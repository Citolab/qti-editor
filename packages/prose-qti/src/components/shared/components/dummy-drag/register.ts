import { DummyDrag } from './dummy-drag.js';

if (!customElements.get('dummy-drag')) {
  customElements.define('dummy-drag', DummyDrag);
}
