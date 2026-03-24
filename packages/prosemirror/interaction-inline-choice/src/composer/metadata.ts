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

export const INLINE_CHOICE_INTERACTION_TAG = 'qti-inline-choice-interaction' as const;
export const INLINE_CHOICE_INTERACTION_NODE_TYPE = 'qtiInlineChoiceInteraction' as const;
export const INLINE_CHOICE_NODE_TYPE = 'qtiInlineChoice' as const;

export const inlineChoiceInteractionComposerMetadata = {
  tagName: INLINE_CHOICE_INTERACTION_TAG,
  nodeTypeName: INLINE_CHOICE_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
  responseProcessing: {
    templateUri: MATCH_CORRECT_TEMPLATE,
    internalKind: 'match_correct',
    internalSourceXml: MATCH_CORRECT_INTERNAL_TEMPLATE,
  },
  editorOnlyAttributes: ['correct-response'],
  userEditableAttributes: ['shuffle'],
} satisfies InteractionComposerMetadata;

export const inlineChoiceNodeAttributePanelMetadataByNodeTypeName = {
  [INLINE_CHOICE_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: INLINE_CHOICE_INTERACTION_NODE_TYPE,
    editableAttributes: inlineChoiceInteractionComposerMetadata.userEditableAttributes,
  },
  [INLINE_CHOICE_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: INLINE_CHOICE_NODE_TYPE,
    editableAttributes: [],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
