import type { InteractionComposerHandler } from '../types.js';
import { composeChoiceInteractionElement } from '../../components/qti-choice-interaction/qti-choice-interaction.compose.js';

export const choiceComposerHandler: InteractionComposerHandler = {
  tagName: 'qti-choice-interaction',
  compose: composeChoiceInteractionElement,
};
