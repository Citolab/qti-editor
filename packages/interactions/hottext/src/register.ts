import { QtiHottextEdit } from './components/qti-hottext/qti-hottext.js';
import { QtiHottextInteractionEdit } from './components/qti-hottext-interaction/qti-hottext-interaction.js';

if (!customElements.get('qti-hottext-interaction')) {
  customElements.define('qti-hottext-interaction', QtiHottextInteractionEdit);
}
if (!customElements.get('qti-hottext')) {
  customElements.define('qti-hottext', QtiHottextEdit);
}
