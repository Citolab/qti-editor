export type ComposerWarningCode =
  | 'MISSING_INTERACTION_COMPOSER_HANDLER'
  | 'INVALID_AREA_MAPPINGS_JSON'
  | 'INVALID_AREA_MAPPING_ENTRY'
  | 'MISSING_RESPONSE_IDENTIFIER';

export interface ComposerWarning {
  code: ComposerWarningCode;
  message: string;
  tagName?: string;
  responseIdentifier?: string;
}

export interface QtiAreaMapEntry {
  shape: 'circle' | 'rect';
  coords: string;
  mappedValue: number;
}

export interface QtiAreaMapping {
  defaultValue: number;
  entries: QtiAreaMapEntry[];
}

export interface InteractionResponseDeclaration {
  identifier: string;
  cardinality: 'single' | 'multiple';
  baseType: 'identifier' | 'point' | 'string';
  correctResponse?: string;
  areaMapping?: QtiAreaMapping;
  sourceTag: string;
}

export interface InteractionComposeResult {
  normalizedElement: Element;
  responseDeclaration?: InteractionResponseDeclaration;
  responseProcessingTemplate?: string;
  editorOnlyAttributes: string[];
  warnings: ComposerWarning[];
}

export interface InteractionComposerMetadata {
  tagName: string;
  responseProcessingTemplate?: string;
  editorOnlyAttributes: readonly string[];
}

export interface InteractionComposerHandler {
  tagName: string;
  compose(sourceElement: Element, xmlDoc: Document): InteractionComposeResult;
}
