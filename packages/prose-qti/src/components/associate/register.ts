import { QtiAssociateInteractionEdit } from './components/qti-associate-interaction/qti-associate-interaction.js';
import '../shared/components/dummy-drag/register.js';

if (!customElements.get('qti-associate-interaction')) {
  customElements.define('qti-associate-interaction', QtiAssociateInteractionEdit);
}
