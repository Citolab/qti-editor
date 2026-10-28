import {
  createAnchorWrapperNodeViewPlugin,
  createInteractionDecoratorPlugin,
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec
} from '@citolab/prose-qti/components/shared';

import { insertHotspotInteraction } from './components/qti-hotspot-interaction/qti-hotspot-interaction.commands.js';
import { qtiHotspotInteractionNodeSpec } from './components/qti-hotspot-interaction/qti-hotspot-interaction.schema.js';
import { imgHotspotNodeSpec } from './components/qti-hotspot-interaction/img-hotspot.schema.js';
import { qtiHotspotChoiceNodeSpec } from './components/qti-hotspot-interaction/qti-hotspot-choice.schema.js';
import {
  hotspotInteractionComposerMetadata,
  hotspotNodeAttributePanelMetadataByNodeTypeName
} from './composer/metadata.js';
import { hotspotComposerHandler } from './composer/handler.js';
import { createHotspotChoiceEditingPlugin } from './extensions/hotspot-choice-editing.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

export const hotspotInteractionDescriptor = {
  tagName: 'qti-hotspot-interaction',
  nodeTypeName: 'qtiHotspotInteraction',
  decoratorPluginFactories: [
    () =>
      createInteractionDecoratorPlugin({
        nodeTypeName: 'qtiHotspotInteraction',
        tagName: 'qti-hotspot-interaction'
      })
  ],
  nodeSpecs: [
    { name: 'qtiHotspotInteraction', spec: qtiHotspotInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'imgHotspot', spec: imgHotspotNodeSpec },
    { name: 'qtiHotspotChoice', spec: qtiHotspotChoiceNodeSpec }
  ],
  pluginFactories: [
    () => createAnchorWrapperNodeViewPlugin({ nodeTypeName: 'qtiHotspotInteraction', display: 'block' }),
    createHotspotChoiceEditingPlugin
  ],
  insertCommand: insertHotspotInteraction,
  composerMetadata: hotspotInteractionComposerMetadata,
  composerHandler: hotspotComposerHandler,
  attributePanelMetadata: hotspotNodeAttributePanelMetadataByNodeTypeName
} satisfies InteractionDescriptor;
