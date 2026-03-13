import type { InteractionComposerHandler } from '@qti-editor/interactions-shared/composer/types.js';
import { composeMatchInteractionElement } from '../components/qti-match-interaction/qti-match-interaction.compose.js';
import { MATCH_INTERACTION_TAG } from './metadata.js';

export const matchComposerHandler: InteractionComposerHandler = {
  tagName: MATCH_INTERACTION_TAG,
  compose: composeMatchInteractionElement,
};
