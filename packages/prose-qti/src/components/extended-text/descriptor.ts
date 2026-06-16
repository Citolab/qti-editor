
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
} from '../shared';
import { insertExtendedTextInteraction } from './components/qti-extended-text-interaction/qti-extended-text-interaction.commands.js';
import { qtiExtendedTextInteractionNodeSpec } from './components/qti-extended-text-interaction/qti-extended-text-interaction.schema.js';
import { extendedTextInteractionComposerMetadata, extendedTextNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { extendedTextComposerHandler } from './composer/handler.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';

export const extendedTextInteractionDescriptor = {
  tagName: 'qti-extended-text-interaction',
  nodeTypeName: 'qtiExtendedTextInteraction',
  nodeSpecs: [
    { name: 'qtiExtendedTextInteraction', spec: qtiExtendedTextInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
  ],
  insertCommand: insertExtendedTextInteraction,
  composerMetadata: extendedTextInteractionComposerMetadata,
  composerHandler: extendedTextComposerHandler,
  attributePanelMetadata: extendedTextNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
