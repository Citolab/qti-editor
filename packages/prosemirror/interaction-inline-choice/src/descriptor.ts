
import {
  insertInlineChoiceInteraction,
  insertInlineChoiceOnEnter,
} from './components/qti-inline-choice-interaction/qti-inline-choice-interaction.commands.js';
import { qtiInlineChoiceInteractionNodeSpec } from './components/qti-inline-choice-interaction/qti-inline-choice-interaction.schema.js';
import { qtiInlineChoiceNodeSpec } from './components/qti-inline-choice-interaction/qti-inline-choice.schema.js';
import {
  inlineChoiceInteractionComposerMetadata,
  inlineChoiceNodeAttributePanelMetadataByNodeTypeName,
} from './composer/metadata.js';
import { inlineChoiceComposerHandler } from './composer/handler.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

export const inlineChoiceInteractionDescriptor = {
  tagName: 'qti-inline-choice-interaction',
  nodeTypeName: 'qtiInlineChoiceInteraction',
  nodeSpecs: [
    { name: 'qtiInlineChoiceInteraction', spec: qtiInlineChoiceInteractionNodeSpec },
    { name: 'qtiInlineChoice', spec: qtiInlineChoiceNodeSpec },
  ],
  insertCommand: insertInlineChoiceInteraction,
  keyboardShortcut: 'Mod-Shift-l',
  enterCommand: insertInlineChoiceOnEnter,
  composerMetadata: inlineChoiceInteractionComposerMetadata,
  composerHandler: inlineChoiceComposerHandler,
  attributePanelMetadata: inlineChoiceNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
