import { QtiAssociateInteractionEdit } from './components/qti-associate-interaction/qti-associate-interaction.js';

if (!customElements.get('qti-associate-interaction')) {
  customElements.define('qti-associate-interaction', QtiAssociateInteractionEdit);
}
