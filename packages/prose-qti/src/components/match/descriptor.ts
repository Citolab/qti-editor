import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleMatchSetNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
} from '../shared';
import {
  insertMatchInteraction,
  insertSimpleAssociableChoiceOnEnter,
} from './components/qti-match-interaction/qti-match-interaction.commands.js';
import { qtiMatchInteractionNodeSpec } from './components/qti-match-interaction/qti-match-interaction.schema.js';
import { qtiMatchInteractionTabularNodeSpec } from './components/qti-match-interaction/qti-match-interaction-tabular.schema.js';
import {
  matchInteractionComposerMetadata,
  matchNodeAttributePanelMetadataByNodeTypeName,
} from './composer/metadata.js';
import { matchComposerHandler } from './composer/handler.js';
import { createQtiMatchTabularNodeViewPlugin } from './extensions/tabular-node-view.js';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';


export const matchInteractionDescriptor = {
  tagName: 'qti-match-interaction',
  nodeTypeName: 'qtiMatchInteraction',
  baseSchemaDependencies: {
    nodeGroups: ['qtiMedia'],
  },
  nodeSpecs: [
    { name: 'qtiMatchInteractionTabular', spec: qtiMatchInteractionTabularNodeSpec },
    { name: 'qtiMatchInteraction', spec: qtiMatchInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleMatchSet', spec: qtiSimpleMatchSetNodeSpec },
    { name: 'qtiSimpleAssociableChoice', spec: qtiSimpleAssociableChoiceNodeSpec },
    { name: 'qtiSimpleAssociableChoiceParagraph', spec: qtiSimpleAssociableChoiceParagraphNodeSpec },
  ],
  insertCommand: insertMatchInteraction,
  enterCommand: insertSimpleAssociableChoiceOnEnter,
  composerMetadata: matchInteractionComposerMetadata,
  composerHandler: matchComposerHandler,
  attributePanelMetadata: matchNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;

export const matchInteractionTabularDescriptor = {
  tagName: 'qti-match-interaction',
  nodeTypeName: 'qtiMatchInteractionTabular',
  baseSchemaDependencies: {
    nodeGroups: ['qtiMedia'],
  },
  nodeSpecs: [
    { name: 'qtiMatchInteractionTabular', spec: qtiMatchInteractionTabularNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    { name: 'qtiPromptParagraph', spec: qtiPromptParagraphNodeSpec },
    { name: 'qtiSimpleMatchSet', spec: qtiSimpleMatchSetNodeSpec },
    { name: 'qtiSimpleAssociableChoice', spec: qtiSimpleAssociableChoiceNodeSpec },
    { name: 'qtiSimpleAssociableChoiceParagraph', spec: qtiSimpleAssociableChoiceParagraphNodeSpec },
  ],
  pluginFactories: [createQtiMatchTabularNodeViewPlugin],
  enterCommand: insertSimpleAssociableChoiceOnEnter,
  composerMetadata: matchInteractionComposerMetadata,
  composerHandler: matchComposerHandler,
  attributePanelMetadata: matchNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
