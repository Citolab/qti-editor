import { insertHottextInteraction } from './components/qti-hottext-interaction/qti-hottext-interaction.commands.js';
import { qtiHottextInteractionNodeSpec } from './components/qti-hottext-interaction/qti-hottext-interaction.schema.js';
import { qtiHottextNodeSpec } from './components/qti-hottext/qti-hottext.schema.js';
import { hottextComposerHandler } from './composer/handler.js';
import { createHottextSelectedDecorationsPlugin } from './extensions/selected-decorations.js';
import { createHottextWrapSelectionPlugin } from './extensions/wrap-selection.js';
import {
  hottextInteractionComposerMetadata,
  hottextNodeAttributePanelMetadataByNodeTypeName,
} from './composer/metadata.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

export const hottextInteractionDescriptor = {
  tagName: 'qti-hottext-interaction',
  nodeTypeName: 'qtiHottextInteraction',
  nodeSpecs: [
    { name: 'qtiHottextInteraction', spec: qtiHottextInteractionNodeSpec },
    { name: 'qtiHottext', spec: qtiHottextNodeSpec },
  ],
  pluginFactories: [createHottextWrapSelectionPlugin, createHottextSelectedDecorationsPlugin],
  insertCommand: insertHottextInteraction,
  composerMetadata: hottextInteractionComposerMetadata,
  composerHandler: hottextComposerHandler,
  attributePanelMetadata: hottextNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
