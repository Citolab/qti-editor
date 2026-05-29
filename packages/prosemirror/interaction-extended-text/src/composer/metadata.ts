import { type InteractionComposerMetadata, type NodeAttributePanelMetadata } from '@qti-editor/interaction-shared/composer/types.js';

import { extendedTextAttributesFriendlyEditor } from '../attributes/extended-text-attributes-editor.js';

export const EXTENDED_TEXT_INTERACTION_TAG = 'qti-extended-text-interaction' as const;
export const EXTENDED_TEXT_INTERACTION_NODE_TYPE = 'qtiExtendedTextInteraction' as const;

export const extendedTextInteractionComposerMetadata = {
  tagName: EXTENDED_TEXT_INTERACTION_TAG,
  nodeTypeName: EXTENDED_TEXT_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: undefined, // Extended text responses typically require manual scoring
  responseProcessing: {
    templateUri: '',
    internalKind: undefined,
    internalSourceXml: '',
  },
  nonQtiAttributes: ['correct-response', 'rubricScoringBlock', 'score'],
  userEditableAttributes: ['expectedLength', 'expectedLines', 'placeholderText', 'format', 'rubricScoringBlock', 'class', 'score'],

} satisfies InteractionComposerMetadata;

export const extendedTextNodeAttributePanelMetadataByNodeTypeName = {
  [EXTENDED_TEXT_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: EXTENDED_TEXT_INTERACTION_NODE_TYPE,
    editableAttributes: extendedTextInteractionComposerMetadata.userEditableAttributes,
    hiddenAttributes: ['class', 'rubricScoringBlock'],
    friendlyEditors: [extendedTextAttributesFriendlyEditor],
    fields: { score: { label: 'Score', input: 'number' } },
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
