import { type InteractionComposerMetadata, type NodeAttributePanelMetadata } from '@citolab/prose-qti/components/shared/composer/types.js';

export const MAP_RESPONSE_POINT_TEMPLATE =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point.xml';

const MAP_RESPONSE_POINT_INTERNAL_TEMPLATE = `
  <qti-set-outcome-value identifier="SCORE">
    <qti-sum>
      <qti-variable identifier="SCORE"/>
      <qti-map-response-point identifier="$responseIdentifier"/>
    </qti-sum>
  </qti-set-outcome-value>
`;

export const SELECT_POINT_INTERACTION_TAG = 'qti-select-point-interaction' as const;
export const SELECT_POINT_INTERACTION_NODE_TYPE = 'qtiSelectPointInteraction' as const;

export const selectPointInteractionComposerMetadata = {
  tagName: SELECT_POINT_INTERACTION_TAG,
  nodeTypeName: SELECT_POINT_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MAP_RESPONSE_POINT_TEMPLATE,
  responseProcessing: {
    templateUri: MAP_RESPONSE_POINT_TEMPLATE,
    internalKind: 'map_response_point',
    internalSourceXml: MAP_RESPONSE_POINT_INTERNAL_TEMPLATE,
  },
  strippedAttributes: ['correct-response', 'score', 'area-mappings'],
} satisfies InteractionComposerMetadata;

export const selectPointNodeAttributePanelMetadataByNodeTypeName = {
  [SELECT_POINT_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: SELECT_POINT_INTERACTION_NODE_TYPE,
    editableAttributes: ['maxChoices', 'minChoices', 'score'],
    fields: { score: { label: 'Score', input: 'number' } },
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
