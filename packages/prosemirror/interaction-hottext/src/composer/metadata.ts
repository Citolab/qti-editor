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
        <qti-sum>
          <qti-variable identifier="SCORE"/>
          <qti-base-value base-type="float">1</qti-base-value>
        </qti-sum>
      </qti-set-outcome-value>
    </qti-response-if>
  </qti-response-condition>
`;

export const HOTTEXT_INTERACTION_TAG = 'qti-hottext-interaction' as const;
export const HOTTEXT_INTERACTION_NODE_TYPE = 'qtiHottextInteraction' as const;

export const hottextInteractionComposerMetadata = {
  tagName: HOTTEXT_INTERACTION_TAG,
  nodeTypeName: HOTTEXT_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
  responseProcessing: {
    templateUri: MATCH_CORRECT_TEMPLATE,
    internalKind: 'match_correct',
    internalSourceXml: MATCH_CORRECT_INTERNAL_TEMPLATE,
  },
  editorOnlyAttributes: ['class'],
  userEditableAttributes: ['maxChoices', 'minChoices', 'correctResponse'],
} satisfies InteractionComposerMetadata;

export const hottextNodeAttributePanelMetadataByNodeTypeName = {
  [HOTTEXT_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: HOTTEXT_INTERACTION_NODE_TYPE,
    editableAttributes: hottextInteractionComposerMetadata.userEditableAttributes,
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
