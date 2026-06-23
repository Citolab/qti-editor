import { QtiMatchInteractionEdit } from './components/qti-match-interaction/qti-match-interaction.js';

if (!customElements.get('qti-match-interaction')) {
  customElements.define('qti-match-interaction', QtiMatchInteractionEdit);
}
