import type { InteractionComposerMetadata, NodeAttributePanelMetadata } from '@qti-editor/interaction-shared/composer/types.js';

const MATCH_CORRECT_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';

const MATCH_CORRECT_INTERNAL_TEMPLATE = `
  <qti-response-condition>
    <qti-response-if>
      <qti-match>
        <qti-variable identifier="$responseIdentifier"/>
        <qti-correct identifier="$responseIdentifier"/>
      </qti-match>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">1</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-if>
    <qti-response-else>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">0</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-else>
  </qti-response-condition>
`;

export const ORDER_INTERACTION_TAG = 'qti-order-interaction' as const;
export const ORDER_INTERACTION_NODE_TYPE = 'qtiOrderInteraction' as const;

export const orderInteractionComposerMetadata = {
  tagName: ORDER_INTERACTION_TAG,
  nodeTypeName: ORDER_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
  responseProcessing: {
    templateUri: MATCH_CORRECT_TEMPLATE,
    internalKind: 'match_correct',
    internalSourceXml: MATCH_CORRECT_INTERNAL_TEMPLATE,
  },
  editorOnlyAttributes: ['class', 'score'],
  userEditableAttributes: ['shuffle', 'correctResponse', 'score'],
} satisfies InteractionComposerMetadata;

export const orderNodeAttributePanelMetadataByNodeTypeName = {
  [ORDER_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: ORDER_INTERACTION_NODE_TYPE,
    editableAttributes: orderInteractionComposerMetadata.userEditableAttributes,
    fields: { score: { label: 'Score', input: 'number' } },
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
