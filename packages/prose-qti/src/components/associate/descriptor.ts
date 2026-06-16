import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
} from '../shared';
import { insertAssociateInteraction, qtiAssociateEnterCommand } from './components/qti-associate-interaction/qti-associate-interaction.commands.js';
import { qtiAssociateInteractionNodeSpec } from './components/qti-associate-interaction/qti-associate-interaction.schema.js';
import { associateInteractionComposerMetadata, associateNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { associateComposerHandler } from './composer/handler.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

export const associateInteractionDescriptor = {
  tagName: 'qti-associate-interaction',
  nodeTypeName: 'qtiAssociateInteraction',
  baseSchemaDependencies: {
    nodeGroups: ['qtiMedia'],
  },
  nodeSpecs: [
    { name: 'qtiAssociateInteraction', spec: qtiAssociateInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleAssociableChoice', spec: qtiSimpleAssociableChoiceNodeSpec },
    { name: 'qtiSimpleAssociableChoiceParagraph', spec: qtiSimpleAssociableChoiceParagraphNodeSpec },
  ],
  insertCommand: insertAssociateInteraction,
  enterCommand: qtiAssociateEnterCommand,
  composerMetadata: associateInteractionComposerMetadata,
  composerHandler: associateComposerHandler,
  attributePanelMetadata: associateNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
