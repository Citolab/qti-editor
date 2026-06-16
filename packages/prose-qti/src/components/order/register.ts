import { QtiOrderInteractionEdit } from './components/qti-order-interaction/qti-order-interaction.js';

if (!customElements.get('qti-order-interaction')) {
  customElements.define('qti-order-interaction', QtiOrderInteractionEdit);
}
