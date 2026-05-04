import type { InteractionComposerMetadata, NodeAttributePanelMetadata } from '@qti-editor/interaction-shared/composer/types.js';

const MAP_RESPONSE_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response';

const MAP_RESPONSE_INTERNAL_TEMPLATE = `
  <qti-response-condition>
    <qti-response-if>
      <qti-is-null>
        <qti-variable identifier="$responseIdentifier"/>
      </qti-is-null>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">0</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-if>
    <qti-response-else>
      <qti-set-outcome-value identifier="SCORE">
        <qti-map-response identifier="$responseIdentifier"/>
      </qti-set-outcome-value>
    </qti-response-else>
  </qti-response-condition>
`;

export const ASSOCIATE_INTERACTION_TAG = 'qti-associate-interaction' as const;
export const ASSOCIATE_INTERACTION_NODE_TYPE = 'qtiAssociateInteraction' as const;

export const associateInteractionComposerMetadata = {
  tagName: ASSOCIATE_INTERACTION_TAG,
  nodeTypeName: ASSOCIATE_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MAP_RESPONSE_TEMPLATE,
  responseProcessing: {
    templateUri: MAP_RESPONSE_TEMPLATE,
    internalKind: 'map_response',
    internalSourceXml: MAP_RESPONSE_INTERNAL_TEMPLATE,
  },
  editorOnlyAttributes: ['class', 'score'],
  userEditableAttributes: ['maxAssociations', 'minAssociations', 'shuffle', 'correctResponse', 'score'],
} satisfies InteractionComposerMetadata;

export const associateNodeAttributePanelMetadataByNodeTypeName = {
  [ASSOCIATE_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: ASSOCIATE_INTERACTION_NODE_TYPE,
    editableAttributes: associateInteractionComposerMetadata.userEditableAttributes,
    fields: { score: { label: 'Score', input: 'number' } },
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
