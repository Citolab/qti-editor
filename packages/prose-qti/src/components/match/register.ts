import { QtiMatchInteractionEdit } from './components/qti-match-interaction/qti-match-interaction.js';
import { QtiMatchInteractionTabularEdit } from './components/qti-match-interaction-tabular/qti-match-interaction-tabular.js';

if (!customElements.get('qti-match-interaction')) {
  customElements.define('qti-match-interaction', QtiMatchInteractionEdit);
}
if (!customElements.get('qti-match-interaction-tabular')) {
  customElements.define('qti-match-interaction-tabular', QtiMatchInteractionTabularEdit);
}
