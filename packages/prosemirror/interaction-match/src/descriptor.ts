import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleMatchSetNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-shared';

import { insertMatchInteraction } from './components/qti-match-interaction/qti-match-interaction.commands.js';
import { qtiMatchInteractionNodeSpec } from './components/qti-match-interaction/qti-match-interaction.schema.js';
import { matchInteractionComposerMetadata, matchNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { matchComposerHandler } from './composer/handler.js';
import { createMatchCorrectResponsePlugin } from './extensions/correct-response.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';


export const matchInteractionDescriptor = {
  tagName: 'qti-match-interaction',
  nodeTypeName: 'qtiMatchInteraction',
  nodeSpecs: [
    { name: 'qtiMatchInteraction', spec: qtiMatchInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleMatchSet', spec: qtiSimpleMatchSetNodeSpec },
    { name: 'qtiSimpleAssociableChoice', spec: qtiSimpleAssociableChoiceNodeSpec },
    { name: 'qtiSimpleAssociableChoiceParagraph', spec: qtiSimpleAssociableChoiceParagraphNodeSpec },
  ],
  pluginFactories: [createMatchCorrectResponsePlugin],
  insertCommand: insertMatchInteraction,
  keyboardShortcut: 'Mod-Shift-m',
  composerMetadata: matchInteractionComposerMetadata,
  composerHandler: matchComposerHandler,
  attributePanelMetadata: matchNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
