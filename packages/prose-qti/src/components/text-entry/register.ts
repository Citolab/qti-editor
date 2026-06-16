import { QtiTextEntryInteractionEdit } from './components/qti-text-entry-interaction/qti-text-entry-interaction.js';

if (!customElements.get('qti-text-entry-interaction')) {
  customElements.define('qti-text-entry-interaction', QtiTextEntryInteractionEdit);
}
