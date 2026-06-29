import { type InteractionComposerMetadata, type NodeAttributePanelMetadata } from '../../shared/composer/types.js';

const MATCH_CORRECT_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';

const MATCH_CORRECT_INTERNAL_TEMPLATE = `
  <qti-response-condition>
    <qti-response-if>
      <qti-match>
        <qti-variable identifier="$responseIdentifier"/>
        <qti-correct identifier="$responseIdentifier"/>
      </qti-match>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">$score</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-if>
    <qti-response-else>
      <qti-set-outcome-value identifier="SCORE">
        <qti-base-value base-type="float">0</qti-base-value>
      </qti-set-outcome-value>
    </qti-response-else>
  </qti-response-condition>
`;

export const ASSOCIATE_INTERACTION_TAG = 'qti-associate-interaction' as const;
export const ASSOCIATE_INTERACTION_NODE_TYPE = 'qtiAssociateInteraction' as const;

export const associateInteractionComposerMetadata = {
  tagName: ASSOCIATE_INTERACTION_TAG,
  nodeTypeName: ASSOCIATE_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
  responseProcessing: {
    templateUri: MATCH_CORRECT_TEMPLATE,
    internalKind: 'match_correct',
    internalSourceXml: MATCH_CORRECT_INTERNAL_TEMPLATE,
  },
  strippedAttributes: ['correct-response', 'score'],
} satisfies InteractionComposerMetadata;

export const associateNodeAttributePanelMetadataByNodeTypeName = {
  [ASSOCIATE_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: ASSOCIATE_INTERACTION_NODE_TYPE,
    // `minAssociations`, `score`, `correctResponse` are managed by the editor
    // (correct-response authoring + score template) — kept out of the allowlist
    // so the panel renders them disabled as system attributes.
    editableAttributes: ['maxAssociations', 'shuffle'],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
