import type { InteractionComposerHandler } from '../types.js';
import { composeSelectPointInteractionElement } from '../../components/qti-select-point-interaction/qti-select-point-interaction.compose.js';

export const selectPointComposerHandler: InteractionComposerHandler = {
  tagName: 'qti-select-point-interaction',
  compose: composeSelectPointInteractionElement,
};
