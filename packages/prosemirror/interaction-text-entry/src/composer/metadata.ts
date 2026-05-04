import { textEntryAttributesFriendlyEditor } from '../attributes/text-entry-attributes-editor.js';

import type { InteractionComposerMetadata, NodeAttributePanelMetadata } from '@qti-editor/interaction-shared/composer/types.js';

export const MAP_RESPONSE_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response';

const MAP_RESPONSE_INTERNAL_TEMPLATE = `
  <qti-set-outcome-value identifier="SCORE">
    <qti-sum>
      <qti-variable identifier="SCORE"/>
      <qti-map-response identifier="$responseIdentifier"/>
    </qti-sum>
  </qti-set-outcome-value>
`;

export const TEXT_ENTRY_INTERACTION_TAG = 'qti-text-entry-interaction' as const;
export const TEXT_ENTRY_INTERACTION_NODE_TYPE = 'qtiTextEntryInteraction' as const;

export const textEntryInteractionComposerMetadata = {
  tagName: TEXT_ENTRY_INTERACTION_TAG,
  nodeTypeName: TEXT_ENTRY_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MAP_RESPONSE_TEMPLATE,
  responseProcessing: {
    templateUri: MAP_RESPONSE_TEMPLATE,
    internalKind: 'map_response',
    internalSourceXml: MAP_RESPONSE_INTERNAL_TEMPLATE,
  },
  editorOnlyAttributes: ['class', 'case-sensitive', 'correct-responses', 'score'],
  userEditableAttributes: ['class', 'caseSensitive', 'correctResponses', 'correctResponse', 'placeholderText', 'score'],
} satisfies InteractionComposerMetadata;

export const textEntryNodeAttributePanelMetadataByNodeTypeName = {
  [TEXT_ENTRY_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: TEXT_ENTRY_INTERACTION_NODE_TYPE,
    editableAttributes: textEntryInteractionComposerMetadata.userEditableAttributes,
    hiddenAttributes: ['class', 'caseSensitive', 'correctResponses', 'correctResponse'],
    friendlyEditors: [textEntryAttributesFriendlyEditor],
    fields: { score: { label: 'Score', input: 'number' } },
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
