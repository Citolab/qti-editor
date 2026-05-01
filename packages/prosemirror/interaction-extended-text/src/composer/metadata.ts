import { extendedTextAttributesFriendlyEditor } from '../attributes/extended-text-attributes-editor.js';

import type { InteractionComposerMetadata, NodeAttributePanelMetadata } from '@qti-editor/interaction-shared/composer/types.js';

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
  editorOnlyAttributes: ['class', 'correctResponse'],
  userEditableAttributes: ['expectedLength', 'expectedLines', 'placeholderText', 'format', 'correctResponse', 'class'],
} satisfies InteractionComposerMetadata;

export const extendedTextNodeAttributePanelMetadataByNodeTypeName = {
  [EXTENDED_TEXT_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: EXTENDED_TEXT_INTERACTION_NODE_TYPE,
    editableAttributes: extendedTextInteractionComposerMetadata.userEditableAttributes,
    hiddenAttributes: ['class', 'correctResponse'],
    friendlyEditors: [extendedTextAttributesFriendlyEditor],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
