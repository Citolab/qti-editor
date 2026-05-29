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
 * Declaration of a non-QTI attribute on an interaction source element.
 *
 * - A bare `string` is shorthand for `{ source, mirror: \`data-${source}\` }`.
 * - The object form supports two special cases:
 *   - `mirror: false` — strip the attribute on compose but do NOT mirror it to
 *     any `data-*` attribute on the normalized element (e.g. `rubricScoringBlock`,
 *     whose content is preserved via a synthesized `<qti-rubric-block>` instead).
 *   - `aliases` — additional source attribute names that mirror to the same
 *     target. Defensive net for raw-XML callers that bypass upstream renames
 *     (e.g. camelCase `correctResponse` / `correctAnswer` → `data-correct-response`).
 */
export type NonQtiAttribute =
  | string
  | {
      /** The canonical attribute name on the source element. */
      source: string;
      /**
       * The data-* attribute to mirror to.
       * - Omit to derive as `data-${source}`.
       * - Set to `false` to strip without mirroring (e.g. `rubricScoringBlock`).
       */
      mirror?: string | false;
      /**
       * Additional source attribute names that mirror to the same target.
       * Defensive net for raw-XML callers that bypass upstream renames
       * (e.g. camelCase `correctResponse` / `correctAnswer` → `data-correct-response`).
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
