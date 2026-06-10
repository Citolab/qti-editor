import { QtiChoiceInteractionEdit } from './components/qti-choice-interaction/qti-choice-interaction.js';

if (!customElements.get('qti-choice-interaction')) {
  customElements.define('qti-choice-interaction', QtiChoiceInteractionEdit);
}
