import { QtiGapMatchInteractionEdit } from './components/qti-gap-match-interaction/qti-gap-match-interaction.js';

if (!customElements.get('qti-gap-match-interaction')) {
  customElements.define('qti-gap-match-interaction', QtiGapMatchInteractionEdit);
}
