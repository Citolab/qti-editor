import type { InteractionDescriptor } from '@qti-editor/interfaces';

import { insertChoiceInteraction, insertSimpleChoiceOnEnter } from './components/qti-choice-interaction/qti-choice-interaction.commands.js';
import { qtiChoiceInteractionNodeSpec } from './components/qti-choice-interaction/qti-choice-interaction.schema.js';
import { choiceInteractionComposerMetadata, choiceNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { choiceComposerHandler } from './composer/handler.js';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-shared';

export const choiceInteractionDescriptor = {
  tagName: 'qti-choice-interaction',
  nodeTypeName: 'qtiChoiceInteraction',
  nodeSpecs: [
    { name: 'qtiChoiceInteraction', spec: qtiChoiceInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleChoice', spec: qtiSimpleChoiceNodeSpec },
    { name: 'qtiSimpleChoiceParagraph', spec: qtiSimpleChoiceParagraphNodeSpec },
  ],
  insertCommand: insertChoiceInteraction,
  keyboardShortcut: 'Mod-Shift-q',
  enterCommand: insertSimpleChoiceOnEnter,
  composerMetadata: choiceInteractionComposerMetadata,
  composerHandler: choiceComposerHandler,
  attributePanelMetadata: choiceNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
