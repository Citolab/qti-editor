import { QtiExtendedTextInteractionEdit } from './components/qti-extended-text-interaction/qti-extended-text-interaction.js';

if (!customElements.get('qti-extended-text-interaction')) {
  customElements.define('qti-extended-text-interaction', QtiExtendedTextInteractionEdit);
}
