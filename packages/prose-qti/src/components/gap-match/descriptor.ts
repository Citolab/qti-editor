import {
  qtiGapNodeSpec,
  qtiGapTextNodeSpec,
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
} from '../shared';
import { insertGapMatchInteraction, qtiGapMatchEnterCommand } from './components/qti-gap-match-interaction/qti-gap-match-interaction.commands.js';
import { qtiGapMatchInteractionNodeSpec } from './components/qti-gap-match-interaction/qti-gap-match-interaction.schema.js';
import { gapMatchInteractionComposerMetadata, gapMatchNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { gapMatchComposerHandler } from './composer/handler.js';
import { createGapMatchNodeViewPlugin } from './extensions/node-view.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

export const gapMatchInteractionDescriptor = {
  tagName: 'qti-gap-match-interaction',
  nodeTypeName: 'qtiGapMatchInteraction',
  nodeSpecs: [
    { name: 'qtiGapMatchInteraction', spec: qtiGapMatchInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiGapText', spec: qtiGapTextNodeSpec },
    { name: 'qtiGap', spec: qtiGapNodeSpec },
  ],
  pluginFactories: [createGapMatchNodeViewPlugin],
  insertCommand: insertGapMatchInteraction,
  enterCommand: qtiGapMatchEnterCommand,
  composerMetadata: gapMatchInteractionComposerMetadata,
  composerHandler: gapMatchComposerHandler,
  attributePanelMetadata: gapMatchNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
