import { composeChoiceInteractionElement } from '../components/qti-choice-interaction/qti-choice-interaction.compose.js';
import { CHOICE_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@citolab/prose-qti/components/shared/composer/types.js';

export const choiceComposerHandler: InteractionComposerHandler = {
  tagName: CHOICE_INTERACTION_TAG,
  compose: composeChoiceInteractionElement,
};
