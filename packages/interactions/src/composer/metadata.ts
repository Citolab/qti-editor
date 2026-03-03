import type { InteractionComposerMetadata } from './types.js';

export const MATCH_CORRECT_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';
export const MAP_RESPONSE_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response';
export const MAP_RESPONSE_POINT_TEMPLATE =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point.xml';

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

const MAP_RESPONSE_INTERNAL_TEMPLATE = `
  <qti-set-outcome-value identifier="SCORE">
    <qti-sum>
      <qti-variable identifier="SCORE"/>
      <qti-map-response identifier="$responseIdentifier"/>
    </qti-sum>
  </qti-set-outcome-value>
`;

const MAP_RESPONSE_POINT_INTERNAL_TEMPLATE = `
  <qti-set-outcome-value identifier="SCORE">
    <qti-sum>
      <qti-variable identifier="SCORE"/>
      <qti-map-response-point identifier="$responseIdentifier"/>
    </qti-sum>
  </qti-set-outcome-value>
`;

export const CHOICE_INTERACTION_TAG = 'qti-choice-interaction' as const;
export const TEXT_ENTRY_INTERACTION_TAG = 'qti-text-entry-interaction' as const;
export const SELECT_POINT_INTERACTION_TAG = 'qti-select-point-interaction' as const;
export const CHOICE_INTERACTION_NODE_TYPE = 'qtiChoiceInteraction' as const;
export const TEXT_ENTRY_INTERACTION_NODE_TYPE = 'qtiTextEntryInteraction' as const;
export const SELECT_POINT_INTERACTION_NODE_TYPE = 'qtiSelectPointInteraction' as const;

export const interactionComposerMetadataByTagName = {
  [CHOICE_INTERACTION_TAG]: {
    tagName: CHOICE_INTERACTION_TAG,
    nodeTypeName: CHOICE_INTERACTION_NODE_TYPE,
    responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
    responseProcessing: {
      templateUri: MATCH_CORRECT_TEMPLATE,
      internalKind: 'match_correct',
      internalSourceXml: MATCH_CORRECT_INTERNAL_TEMPLATE
    },
    editorOnlyAttributes: ['class'],
    userEditableAttributes: ['maxChoices']
  },
  [TEXT_ENTRY_INTERACTION_TAG]: {
    tagName: TEXT_ENTRY_INTERACTION_TAG,
    nodeTypeName: TEXT_ENTRY_INTERACTION_NODE_TYPE,
    responseProcessingTemplate: MAP_RESPONSE_TEMPLATE,
    responseProcessing: {
      templateUri: MAP_RESPONSE_TEMPLATE,
      internalKind: 'map_response',
      internalSourceXml: MAP_RESPONSE_INTERNAL_TEMPLATE
    },
    editorOnlyAttributes: ['class'],
    userEditableAttributes: []
  },
  [SELECT_POINT_INTERACTION_TAG]: {
    tagName: SELECT_POINT_INTERACTION_TAG,
    nodeTypeName: SELECT_POINT_INTERACTION_NODE_TYPE,
    responseProcessingTemplate: MAP_RESPONSE_POINT_TEMPLATE,
    responseProcessing: {
      templateUri: MAP_RESPONSE_POINT_TEMPLATE,
      internalKind: 'map_response_point',
      internalSourceXml: MAP_RESPONSE_POINT_INTERNAL_TEMPLATE
    },
    editorOnlyAttributes: [
      'class',
      'area-mappings',
      'image-src',
      'image-alt',
      'image-width',
      'image-height',
      'prompt',
      'correct-response'
    ],
    userEditableAttributes: ['maxChoices', 'minChoices']
  }
} satisfies Record<string, InteractionComposerMetadata>;

export const interactionComposerMetadataByNodeTypeName = Object.values(interactionComposerMetadataByTagName).reduce<
  Record<string, InteractionComposerMetadata>
>((acc, metadata) => {
  acc[metadata.nodeTypeName.toLowerCase()] = metadata;
  return acc;
}, {});

export function getInteractionComposerMetadata(tagName: string): InteractionComposerMetadata | undefined {
  return interactionComposerMetadataByTagName[tagName.toLowerCase()];
}

export function getInteractionComposerMetadataByNodeTypeName(
  nodeTypeName: string
): InteractionComposerMetadata | undefined {
  return interactionComposerMetadataByNodeTypeName[nodeTypeName.toLowerCase()];
}
