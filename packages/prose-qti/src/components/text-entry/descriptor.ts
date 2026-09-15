import { insertTextEntryInteraction } from './components/qti-text-entry-interaction/qti-text-entry-interaction.commands.js';
import { qtiTextEntryInteractionNodeSpec } from './components/qti-text-entry-interaction/qti-text-entry-interaction.schema.js';
import {
  textEntryInteractionComposerMetadata,
  textEntryNodeAttributePanelMetadataByNodeTypeName
} from './composer/metadata.js';
import { textEntryComposerHandler } from './composer/handler.js';
import { createInteractionDecoratorPlugin } from '../shared';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

export const textEntryInteractionDescriptor = {
  tagName: 'qti-text-entry-interaction',
  nodeTypeName: 'qtiTextEntryInteraction',
  decoratorPluginFactories: [
    () =>
      createInteractionDecoratorPlugin({
        nodeTypeName: 'qtiTextEntryInteraction',
        tagName: 'qti-text-entry-interaction'
      })
  ],
  nodeSpecs: [{ name: 'qtiTextEntryInteraction', spec: qtiTextEntryInteractionNodeSpec }],
  insertCommand: insertTextEntryInteraction,
  composerMetadata: textEntryInteractionComposerMetadata,
  composerHandler: textEntryComposerHandler,
  attributePanelMetadata: textEntryNodeAttributePanelMetadataByNodeTypeName
} satisfies InteractionDescriptor;
