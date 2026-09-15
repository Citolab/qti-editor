import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec
} from '@citolab/prose-qti/components/shared';
import { createChipMenuPlugin, createInteractionDecoratorPlugin } from '@citolab/prose-qti/components/shared';

import { insertOrderInteraction } from './components/qti-order-interaction/qti-order-interaction.commands.js';
import { qtiOrderInteractionNodeSpec } from './components/qti-order-interaction/qti-order-interaction.schema.js';
import {
  orderInteractionComposerMetadata,
  orderNodeAttributePanelMetadataByNodeTypeName
} from './composer/metadata.js';
import { orderComposerHandler } from './composer/handler.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

export const orderInteractionDescriptor = {
  tagName: 'qti-order-interaction',
  nodeTypeName: 'qtiOrderInteraction',
  decoratorPluginFactories: [
    () => createInteractionDecoratorPlugin({ nodeTypeName: 'qtiOrderInteraction', tagName: 'qti-order-interaction' })
  ],
  nodeSpecs: [
    { name: 'qtiOrderInteraction', spec: qtiOrderInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleChoice', spec: qtiSimpleChoiceNodeSpec },
    { name: 'qtiSimpleChoiceParagraph', spec: qtiSimpleChoiceParagraphNodeSpec }
  ],
  pluginFactories: [() => createChipMenuPlugin('order')],
  insertCommand: insertOrderInteraction,
  composerMetadata: orderInteractionComposerMetadata,
  composerHandler: orderComposerHandler,
  attributePanelMetadata: orderNodeAttributePanelMetadataByNodeTypeName
} satisfies InteractionDescriptor;
