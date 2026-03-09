import type { InteractionComposerHandler } from '@qti-editor/interactions-shared/composer/types.js';
import { composeTextEntryInteractionElement } from '../components/qti-text-entry-interaction/qti-text-entry-interaction.compose.js';
import { TEXT_ENTRY_INTERACTION_TAG } from './metadata.js';

export const textEntryComposerHandler: InteractionComposerHandler = {
  tagName: TEXT_ENTRY_INTERACTION_TAG,
  compose: composeTextEntryInteractionElement,
};
