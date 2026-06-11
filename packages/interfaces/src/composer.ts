/**
 * Types for the QTI interaction compose pipeline.
 *
 * Pure TypeScript — no runtime dependencies.
 */

export type ComposerWarningCode =
  | 'MISSING_INTERACTION_COMPOSER_HANDLER'
  | 'INVALID_AREA_MAPPINGS_JSON'
  | 'INVALID_AREA_MAPPING_ENTRY'
  | 'MISSING_RESPONSE_IDENTIFIER'
  | 'MISSING_CORRECT_RESPONSE';

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

export interface QtiStringMapEntry {
  mapKey: string;
  mappedValue: number;
  caseSensitive: boolean;
}

export interface QtiStringMapping {
  defaultValue: number;
  entries: QtiStringMapEntry[];
}

export interface InteractionResponseDeclaration {
  identifier: string;
  cardinality: 'single' | 'multiple' | 'ordered';
  baseType: 'identifier' | 'directedPair' | 'point' | 'string';
  correctResponse?: string | string[];
  areaMapping?: QtiAreaMapping;
  stringMapping?: QtiStringMapping;
  sourceTag: string;
  score?: number;
}

export interface InteractionComposeResult {
  normalizedElement: Element;
  responseDeclaration?: InteractionResponseDeclaration;
  responseProcessingTemplate?: string;
  responseProcessingKind?: ResponseProcessingKind;
  nonQtiAttributes: string[];
  warnings: ComposerWarning[];
  /**
   * Additional elements to insert after the interaction element.
   * Useful for rubric blocks, feedback, etc.
   */
  additionalElements?: Element[];
}

export type ResponseProcessingKind = 'match_correct' | 'map_response' | 'map_response_point';

/**
 * Declaration of a non-QTI authoring attribute on an interaction source
 * element. These are editor-only attributes (e.g. `correct-response`, `score`,
 * `case-sensitive`, `area-mappings`) that the compose pipeline reads and then
 * strips from the emitted standard-QTI interaction — their values are folded
 * into `qti-response-declaration` / `qti-response-processing` instead.
 *
 * - A bare `string` names a single canonical source attribute to strip.
 * - The object form supports:
 *   - `aliases` — additional source attribute names treated as the same
 *     authoring attribute. Defensive net for raw-XML callers that bypass
 *     upstream renames (e.g. camelCase `correctResponse` / `correctAnswer`).
 *   - `mirror` — retained for backwards compatibility; no longer affects
 *     output (the editor emits standard QTI 3.0 with no `data-*` mirrors).
 */
export type NonQtiAttribute =
  | string
  | {
      /** The canonical attribute name on the source element. */
      source: string;
      /**
       * Retained for backwards compatibility only. The editor no longer emits
       * `data-*` mirrors, so this field has no effect on compose output.
       */
      mirror?: string | false;
      /**
       * Additional source attribute names treated as the same authoring
       * attribute. Defensive net for raw-XML callers that bypass upstream
       * renames (e.g. camelCase `correctResponse` / `correctAnswer`).
       */
      aliases?: readonly string[];
    };

export interface InteractionComposerMetadata {
  tagName: string;
  nodeTypeName: string;
  responseProcessingTemplate?: string;
  responseProcessing: {
    templateUri: string;
    internalKind?: ResponseProcessingKind;
    internalSourceXml: string;
  };
  nonQtiAttributes: readonly NonQtiAttribute[];
  userEditableAttributes: readonly string[];
}

export interface InteractionComposerHandler {
  tagName: string;
  compose(sourceElement: Element, xmlDoc: Document): InteractionComposeResult;
}
