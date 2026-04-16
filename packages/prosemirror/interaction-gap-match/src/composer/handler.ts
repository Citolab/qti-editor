import { composeGapMatchInteractionElement } from '../components/qti-gap-match-interaction/qti-gap-match-interaction.compose.js';
import { GAP_MATCH_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@qti-editor/interaction-shared/composer/types.js';

export const gapMatchComposerHandler: InteractionComposerHandler = {
  tagName: GAP_MATCH_INTERACTION_TAG,
  compose: composeGapMatchInteractionElement,
};
