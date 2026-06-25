import { type InteractionComposerMetadata, type NodeAttributePanelMetadata } from '../../shared/composer/types.js';
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
  strippedAttributes: ['score'],

} satisfies InteractionComposerMetadata;

export const extendedTextNodeAttributePanelMetadataByNodeTypeName = {
  [EXTENDED_TEXT_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: EXTENDED_TEXT_INTERACTION_NODE_TYPE,
    editableAttributes: ['expectedLength', 'expectedLines', 'placeholderText', 'patternMask', 'class', 'score'],
    friendlyEditors: [extendedTextAttributesFriendlyEditor],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
