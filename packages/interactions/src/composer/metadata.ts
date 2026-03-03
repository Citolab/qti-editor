import type { InteractionComposerMetadata } from './types.js';

export const MATCH_CORRECT_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';
export const MAP_RESPONSE_TEMPLATE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response';
export const MAP_RESPONSE_POINT_TEMPLATE =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point.xml';

export const CHOICE_INTERACTION_TAG = 'qti-choice-interaction' as const;
export const TEXT_ENTRY_INTERACTION_TAG = 'qti-text-entry-interaction' as const;
export const SELECT_POINT_INTERACTION_TAG = 'qti-select-point-interaction' as const;

export const interactionComposerMetadataByTagName = {
  [CHOICE_INTERACTION_TAG]: {
    tagName: CHOICE_INTERACTION_TAG,
    responseProcessingTemplate: MATCH_CORRECT_TEMPLATE,
    editorOnlyAttributes: ['class', 'correct-response'],
  },
  [TEXT_ENTRY_INTERACTION_TAG]: {
    tagName: TEXT_ENTRY_INTERACTION_TAG,
    responseProcessingTemplate: MAP_RESPONSE_TEMPLATE,
    editorOnlyAttributes: ['class'],
  },
  [SELECT_POINT_INTERACTION_TAG]: {
    tagName: SELECT_POINT_INTERACTION_TAG,
    responseProcessingTemplate: MAP_RESPONSE_POINT_TEMPLATE,
    editorOnlyAttributes: [
      'class',
      'area-mappings',
      'image-src',
      'image-alt',
      'image-width',
      'image-height',
      'prompt',
      'correct-response',
    ],
  },
} satisfies Record<string, InteractionComposerMetadata>;

export function getInteractionComposerMetadata(tagName: string): InteractionComposerMetadata | undefined {
  return interactionComposerMetadataByTagName[tagName.toLowerCase()];
}
