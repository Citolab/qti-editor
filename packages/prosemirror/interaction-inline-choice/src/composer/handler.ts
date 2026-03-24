import type { InteractionComposerHandler } from '@qti-editor/interaction-shared/composer/types.js';
import { composeInlineChoiceInteractionElement } from '../components/qti-inline-choice-interaction/qti-inline-choice-interaction.compose.js';
import { INLINE_CHOICE_INTERACTION_TAG } from './metadata.js';

export const inlineChoiceComposerHandler: InteractionComposerHandler = {
  tagName: INLINE_CHOICE_INTERACTION_TAG,
  compose: composeInlineChoiceInteractionElement,
};
