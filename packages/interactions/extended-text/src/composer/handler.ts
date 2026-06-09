import { composeExtendedTextInteractionElement } from '../components/qti-extended-text-interaction/qti-extended-text-interaction.compose.js';
import { EXTENDED_TEXT_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '@qti-editor/interaction-shared/composer/types.js';

export const extendedTextComposerHandler: InteractionComposerHandler = {
  tagName: EXTENDED_TEXT_INTERACTION_TAG,
  compose: composeExtendedTextInteractionElement,
};
