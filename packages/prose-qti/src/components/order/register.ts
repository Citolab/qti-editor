import { QtiOrderInteractionEdit } from './components/qti-order-interaction/qti-order-interaction.js';
import '../shared/components/dummy-drag/register.js';

if (!customElements.get('qti-order-interaction')) {
  customElements.define('qti-order-interaction', QtiOrderInteractionEdit);
}
