import {
  qtiGapNodeSpec,
  qtiGapTextNodeSpec,
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
} from '@qti-editor/interaction-shared';

import { insertGapMatchInteraction } from './components/qti-gap-match-interaction/qti-gap-match-interaction.commands.js';
import { qtiGapMatchInteractionNodeSpec } from './components/qti-gap-match-interaction/qti-gap-match-interaction.schema.js';
import { gapMatchInteractionComposerMetadata, gapMatchNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { gapMatchComposerHandler } from './composer/handler.js';
import { createGapMatchCorrectResponsePlugin } from './extensions/correct-response.js';
import { createGapMatchNodeViewPlugin } from './extensions/node-view.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

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
  pluginFactories: [createGapMatchNodeViewPlugin, createGapMatchCorrectResponsePlugin],
  insertCommand: insertGapMatchInteraction,
  keyboardShortcut: 'Mod-Shift-g',
  composerMetadata: gapMatchInteractionComposerMetadata,
  composerHandler: gapMatchComposerHandler,
  attributePanelMetadata: gapMatchNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
