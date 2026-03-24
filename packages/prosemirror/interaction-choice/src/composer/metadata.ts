import type { InteractionComposerMetadata, NodeAttributePanelMetadata } from '@qti-editor/interaction-shared/composer/types.js';
import { choiceInteractionClassFriendlyEditor } from '../attributes/choice-interaction-class-editor.js';

export const MATCH_CORRECT_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';

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

export const CHOICE_INTERACTION_TAG = 'qti-choice-interaction' as const;
export const CHOICE_INTERACTION_NODE_TYPE = 'qtiChoiceInteraction' as const;

export const choiceInteractionComposerMetadata = {
  tagName: CHOICE_INTERACTION_TAG,
  nodeTypeName: CHOICE_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
  responseProcessing: {
    templateUri: MATCH_CORRECT_TEMPLATE,
    internalKind: 'match_correct',
    internalSourceXml: MATCH_CORRECT_INTERNAL_TEMPLATE,
  },
  editorOnlyAttributes: ['class'],
  // maxChoices and correctResponse are set by clicking choices, not edited directly
  userEditableAttributes: ['class'],
} satisfies InteractionComposerMetadata;

export const choiceNodeAttributePanelMetadataByNodeTypeName = {
  [CHOICE_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: CHOICE_INTERACTION_NODE_TYPE,
    editableAttributes: choiceInteractionComposerMetadata.userEditableAttributes,
    hiddenAttributes: ['class'],
    friendlyEditors: [choiceInteractionClassFriendlyEditor],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
