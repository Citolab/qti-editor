import { composeSelectPointInteractionElement } from '../components/qti-select-point-interaction/qti-select-point-interaction.compose.js';
import { SELECT_POINT_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@qti-editor/interactions-shared/composer/types.js';

export const selectPointComposerHandler: InteractionComposerHandler = {
  tagName: SELECT_POINT_INTERACTION_TAG,
  compose: composeSelectPointInteractionElement,
};
