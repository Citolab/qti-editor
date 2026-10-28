import { composeHotspotInteractionElement } from '../components/qti-hotspot-interaction/qti-hotspot-interaction.compose.js';
import { HOTSPOT_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@citolab/prose-qti/components/shared/composer/types.js';

export const hotspotComposerHandler: InteractionComposerHandler = {
  tagName: HOTSPOT_INTERACTION_TAG,
  compose: composeHotspotInteractionElement,
};
