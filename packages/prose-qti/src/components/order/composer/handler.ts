import { composeOrderInteractionElement } from '../components/qti-order-interaction/qti-order-interaction.compose.js';
import { ORDER_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@citolab/prose-qti/components/shared/composer/types.js';

export const orderComposerHandler: InteractionComposerHandler = {
  tagName: ORDER_INTERACTION_TAG,
  compose: composeOrderInteractionElement,
};
