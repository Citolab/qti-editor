import { QtiSelectPointInteractionEdit } from './components/qti-select-point-interaction/qti-select-point-interaction.js';

if (!customElements.get('qti-select-point-interaction')) {
  customElements.define('qti-select-point-interaction', QtiSelectPointInteractionEdit);
}
