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
  responseProcessingKind?: ResponseProcessingKind;
  editorOnlyAttributes: string[];
  warnings: ComposerWarning[];
}

export type ResponseProcessingKind = 'match_correct' | 'map_response' | 'map_response_point';

export interface InteractionComposerMetadata {
  tagName: string;
  nodeTypeName: string;
  responseProcessingTemplate?: string;
  responseProcessing: {
    templateUri: string;
    internalKind?: ResponseProcessingKind;
    internalSourceXml: string;
  };
  editorOnlyAttributes: readonly string[];
  userEditableAttributes: readonly string[];
}

export interface NodeAttributePanelMetadata {
  nodeTypeName: string;
  userEditableAttributes: readonly string[];
  hiddenRawAttributes?: readonly string[];
  friendlyEditors?: readonly NodeAttributeFriendlyEditorDefinition[];
}

export interface NodeAttributeFriendlyEditorDefinition {
  attribute: string;
  kind: string;
}

export interface InteractionComposerHandler {
  tagName: string;
  compose(sourceElement: Element, xmlDoc: Document): InteractionComposeResult;
}
