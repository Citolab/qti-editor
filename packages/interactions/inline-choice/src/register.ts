import { QtiInlineChoice } from './components/qti-inline-choice-interaction/qti-inline-choice.js';
import { QtiInlineChoiceInteraction } from './components/qti-inline-choice-interaction/qti-inline-choice-interaction.js';

if (!customElements.get('qti-inline-choice-interaction')) {
  customElements.define('qti-inline-choice-interaction', QtiInlineChoiceInteraction);
}
if (!customElements.get('qti-inline-choice')) {
  customElements.define('qti-inline-choice', QtiInlineChoice);
}
