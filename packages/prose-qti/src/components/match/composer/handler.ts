import { composeMatchInteractionElement } from '../components/qti-match-interaction/qti-match-interaction.compose.js';
import { MATCH_INTERACTION_TAG } from './metadata.js';

import type { InteractionComposerHandler } from '../../shared/composer/types.js';

/**
 * Single composer handler for both the drag-drop and tabular variants. Both
 * editor modes now emit `<qti-match-interaction>` (with or without
 * `class="qti-match-tabular"`); the compose path just preserves the class.
 */
export const matchComposerHandler: InteractionComposerHandler = {
  tagName: MATCH_INTERACTION_TAG,
  compose: composeMatchInteractionElement,
};
