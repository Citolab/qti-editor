import { composeHottextInteractionElement } from '../components/qti-hottext-interaction/qti-hottext-interaction.compose.js';
import { HOTTEXT_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '../../shared/composer/types.js';

export const hottextComposerHandler: InteractionComposerHandler = {
  tagName: HOTTEXT_INTERACTION_TAG,
  compose: composeHottextInteractionElement,
};
