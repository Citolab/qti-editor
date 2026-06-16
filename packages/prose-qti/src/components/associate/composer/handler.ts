import { composeAssociateInteractionElement } from '../components/qti-associate-interaction/qti-associate-interaction.compose.js';
import { ASSOCIATE_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@citolab/prose-qti/components/shared/composer/types.js';

export const associateComposerHandler: InteractionComposerHandler = {
  tagName: ASSOCIATE_INTERACTION_TAG,
  compose: composeAssociateInteractionElement,
};
