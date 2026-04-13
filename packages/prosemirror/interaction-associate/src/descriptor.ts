import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-shared';

import { insertAssociateInteraction, qtiAssociateEnterCommand } from './components/qti-associate-interaction/qti-associate-interaction.commands.js';
import { qtiAssociateInteractionNodeSpec } from './components/qti-associate-interaction/qti-associate-interaction.schema.js';
import { associateInteractionComposerMetadata, associateNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { associateComposerHandler } from './composer/handler.js';
import { createAssociateCorrectResponsePlugin } from './extensions/correct-response.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';


export const associateInteractionDescriptor = {
  tagName: 'qti-associate-interaction',
  nodeTypeName: 'qtiAssociateInteraction',
  nodeSpecs: [
    { name: 'qtiAssociateInteraction', spec: qtiAssociateInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleAssociableChoice', spec: qtiSimpleAssociableChoiceNodeSpec },
    { name: 'qtiSimpleAssociableChoiceParagraph', spec: qtiSimpleAssociableChoiceParagraphNodeSpec },
  ],
  pluginFactories: [createAssociateCorrectResponsePlugin],
  insertCommand: insertAssociateInteraction,
  keyboardShortcut: 'Mod-Shift-a',
  enterCommand: qtiAssociateEnterCommand,
  composerMetadata: associateInteractionComposerMetadata,
  composerHandler: associateComposerHandler,
  attributePanelMetadata: associateNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
