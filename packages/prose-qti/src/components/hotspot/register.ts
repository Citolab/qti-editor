import { QtiHotspotInteractionEdit } from './components/qti-hotspot-interaction/qti-hotspot-interaction.js';

if (!customElements.get('qti-hotspot-interaction')) {
  customElements.define('qti-hotspot-interaction', QtiHotspotInteractionEdit);
}
