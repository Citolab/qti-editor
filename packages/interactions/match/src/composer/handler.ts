import { composeMatchInteractionElement } from '../components/qti-match-interaction/qti-match-interaction.compose.js';
import { MATCH_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@qti-editor/interaction-shared/composer/types.js';

export const matchComposerHandler: InteractionComposerHandler = {
  tagName: MATCH_INTERACTION_TAG,
  compose: composeMatchInteractionElement,
};
