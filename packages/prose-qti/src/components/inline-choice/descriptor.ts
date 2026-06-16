
import {
  insertInlineChoiceInteraction,
  insertInlineChoiceOnEnter,
  deleteInlineChoiceOnBackspace,
} from './components/qti-inline-choice-interaction/qti-inline-choice-interaction.commands.js';
import { qtiInlineChoiceInteractionNodeSpec } from './components/qti-inline-choice-interaction/qti-inline-choice-interaction.schema.js';
import { qtiInlineChoiceNodeSpec } from './components/qti-inline-choice-interaction/qti-inline-choice.schema.js';
import {
  inlineChoiceInteractionComposerMetadata,
  inlineChoiceNodeAttributePanelMetadataByNodeTypeName,
} from './composer/metadata.js';
import { inlineChoiceComposerHandler } from './composer/handler.js';
import { createInlineChoiceCorrectResponseClickPlugin } from './extensions/correct-response-click.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

export const inlineChoiceInteractionDescriptor = {
  tagName: 'qti-inline-choice-interaction',
  nodeTypeName: 'qtiInlineChoiceInteraction',
  nodeSpecs: [
    { name: 'qtiInlineChoiceInteraction', spec: qtiInlineChoiceInteractionNodeSpec },
    { name: 'qtiInlineChoice', spec: qtiInlineChoiceNodeSpec },
  ],
  pluginFactories: [createInlineChoiceCorrectResponseClickPlugin],
  insertCommand: insertInlineChoiceInteraction,
  enterCommand: insertInlineChoiceOnEnter,
  backspaceCommand: deleteInlineChoiceOnBackspace,
  composerMetadata: inlineChoiceInteractionComposerMetadata,
  composerHandler: inlineChoiceComposerHandler,
  attributePanelMetadata: inlineChoiceNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
