import { type InteractionComposerMetadata, type NodeAttributePanelMetadata } from '../../shared/composer/types.js';

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

export const MATCH_INTERACTION_TAG = 'qti-match-interaction' as const;
export const MATCH_INTERACTION_NODE_TYPE = 'qtiMatchInteraction' as const;
export const MATCH_INTERACTION_TABULAR_NODE_TYPE = 'qtiMatchInteractionTabular' as const;
export const SIMPLE_ASSOCIABLE_CHOICE_NODE_TYPE = 'qtiSimpleAssociableChoice' as const;

export const matchInteractionComposerMetadata = {
  tagName: MATCH_INTERACTION_TAG,
  nodeTypeName: MATCH_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MAP_RESPONSE_TEMPLATE,
  responseProcessing: {
    templateUri: MAP_RESPONSE_TEMPLATE,
    internalKind: 'map_response',
    internalSourceXml: MAP_RESPONSE_INTERNAL_TEMPLATE,
  },
  strippedAttributes: ['correct-response', 'score'],
} satisfies InteractionComposerMetadata;

export const matchNodeAttributePanelMetadataByNodeTypeName: Record<string, NodeAttributePanelMetadata> = {
  [MATCH_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: MATCH_INTERACTION_NODE_TYPE,
    // `correctResponse` is authored via the interaction's click-to-associate UI
    // (and shown as fake drags), not by editing raw JSON in the panel, so it is
    // intentionally read-only here.
    editableAttributes: ['shuffle', 'class'],
  },
  [MATCH_INTERACTION_TABULAR_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: MATCH_INTERACTION_TABULAR_NODE_TYPE,
    editableAttributes: ['shuffle', 'class', 'dataFirstColumnHeader'],
  },
  [SIMPLE_ASSOCIABLE_CHOICE_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: SIMPLE_ASSOCIABLE_CHOICE_NODE_TYPE,
    // `identifier`, `matchMax` and `matchMin` are derived from the match set's
    // structure and the correct-response authoring, not hand-edited, so they are
    // read-only here. Only `fixed` (shuffle pinning) stays editable.
    editableAttributes: ['fixed'],
  },
};
