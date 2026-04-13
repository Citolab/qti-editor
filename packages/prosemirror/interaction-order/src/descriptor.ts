import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-shared';

import { insertOrderInteraction } from './components/qti-order-interaction/qti-order-interaction.commands.js';
import { qtiOrderInteractionNodeSpec } from './components/qti-order-interaction/qti-order-interaction.schema.js';
import { orderInteractionComposerMetadata, orderNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { orderComposerHandler } from './composer/handler.js';
import { createOrderCorrectResponsePlugin } from './extensions/correct-response.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

export const orderInteractionDescriptor = {
  tagName: 'qti-order-interaction',
  nodeTypeName: 'qtiOrderInteraction',
  nodeSpecs: [
    { name: 'qtiOrderInteraction', spec: qtiOrderInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleChoice', spec: qtiSimpleChoiceNodeSpec },
    { name: 'qtiSimpleChoiceParagraph', spec: qtiSimpleChoiceParagraphNodeSpec },
  ],
  pluginFactories: [createOrderCorrectResponsePlugin],
  insertCommand: insertOrderInteraction,
  keyboardShortcut: 'Mod-Shift-o',
  composerMetadata: orderInteractionComposerMetadata,
  composerHandler: orderComposerHandler,
  attributePanelMetadata: orderNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
