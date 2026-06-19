import { composeMatchInteractionElement } from '../components/qti-match-interaction/qti-match-interaction.compose.js';
import { composeMatchInteractionTabularElement } from '../components/qti-match-interaction-tabular/qti-match-interaction-tabular.compose.js';
import { MATCH_INTERACTION_TABULAR_TAG, MATCH_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '../../shared/composer/types.js';

export const matchComposerHandler: InteractionComposerHandler = {
  tagName: MATCH_INTERACTION_TAG,
  compose: composeMatchInteractionElement,
};

export const matchTabularComposerHandler: InteractionComposerHandler = {
  tagName: MATCH_INTERACTION_TABULAR_TAG,
  compose: composeMatchInteractionTabularElement,
};
