import type { InteractionComposerHandler } from '../types.js';
import { composeTextEntryInteractionElement } from '../../components/qti-text-entry-interaction/qti-text-entry-interaction.compose.js';

export const textEntryComposerHandler: InteractionComposerHandler = {
  tagName: 'qti-text-entry-interaction',
  compose: composeTextEntryInteractionElement,
};
