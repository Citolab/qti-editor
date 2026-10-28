import { type InteractionComposerMetadata, type NodeAttributePanelMetadata } from '@citolab/prose-qti/components/shared/composer/types.js';

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

export const HOTSPOT_INTERACTION_TAG = 'qti-hotspot-interaction' as const;
export const HOTSPOT_INTERACTION_NODE_TYPE = 'qtiHotspotInteraction' as const;
export const HOTSPOT_CHOICE_NODE_TYPE = 'qtiHotspotChoice' as const;

/**
 * Scored exactly like choice: the correct response is the set of correct choice identifiers and the
 * item uses `match_correct`.
 */
export const hotspotInteractionComposerMetadata = {
  tagName: HOTSPOT_INTERACTION_TAG,
  nodeTypeName: HOTSPOT_INTERACTION_NODE_TYPE,
  responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
  responseProcessing: {
    templateUri: MATCH_CORRECT_TEMPLATE,
    internalKind: 'match_correct',
    internalSourceXml: MATCH_CORRECT_INTERNAL_TEMPLATE,
  },
  strippedAttributes: ['correct-response', 'score'],
} satisfies InteractionComposerMetadata;

export const hotspotNodeAttributePanelMetadataByNodeTypeName = {
  [HOTSPOT_INTERACTION_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: HOTSPOT_INTERACTION_NODE_TYPE,
    // `correctResponse` is set by marking areas in the editor, so it stays a system attribute.
    // `maxChoices` follows the marked areas, as for choice; lowered under their number here, compose
    // exports only the first `maxChoices` of them, with a warning.
    editableAttributes: ['class', 'maxChoices', 'minChoices'],
  },
  [HOTSPOT_CHOICE_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: HOTSPOT_CHOICE_NODE_TYPE,
    // `shape` / `coords` are drawn on the image; `identifier` is referenced by the correct response.
    // Reached by selecting the area on the image, which selects its choice.
    editableAttributes: ['hotspotLabel', 'ariaLabel', 'fixed'],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
