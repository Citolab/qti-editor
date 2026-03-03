import type { InteractionComposerHandler } from '../types.js';
import { composeChoiceInteractionElement } from '../../components/qti-choice-interaction/qti-choice-interaction.compose.js';
import { CHOICE_INTERACTION_TAG } from '../metadata.js';

export const choiceComposerHandler: InteractionComposerHandler = {
  tagName: CHOICE_INTERACTION_TAG,
  compose: composeChoiceInteractionElement,
};
