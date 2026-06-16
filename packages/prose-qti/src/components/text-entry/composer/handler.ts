import { composeTextEntryInteractionElement } from '../components/qti-text-entry-interaction/qti-text-entry-interaction.compose.js';
import { TEXT_ENTRY_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@citolab/prose-qti/components/shared/composer/types.js';

export const textEntryComposerHandler: InteractionComposerHandler = {
  tagName: TEXT_ENTRY_INTERACTION_TAG,
  compose: composeTextEntryInteractionElement,
};
