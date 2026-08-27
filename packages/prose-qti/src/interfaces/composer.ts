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
  | 'MISSING_CORRECT_RESPONSE'
  | 'INVALID_MAPPING_JSON'
  | 'INVALID_MAPPING_ENTRY'
  | 'MAPPING_ENTRY_STALE'
  | 'RESPONSE_PROCESSING_KIND_MISMATCH';

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

/**
 * QTI's clamps on a mapping's total, applied by the runtime AFTER summing the
 * matched entries: `min(upperBound, max(lowerBound, total))`.
 *
 * `null` means the attribute was absent, which is not the same as zero —
 * `lower-bound="0"` stops a negative entry pushing SCORE below zero, while no
 * lower bound lets it. ITEM002 relies on the difference.
 */
export interface QtiMappingBounds {
  lowerBound?: number | null;
  upperBound?: number | null;
}

export interface QtiAreaMapping extends QtiMappingBounds {
  defaultValue: number;
  entries: QtiAreaMapEntry[];
}

export interface QtiStringMapEntry {
  mapKey: string;
  mappedValue: number;
  /**
   * `null` / absent means the source carried no `case-sensitive` attribute, and
   * export leaves it off rather than materialising QTI's `false` default — which
   * would add the attribute to every item that never had it.
   */
  caseSensitive?: boolean | null;
}

export interface QtiStringMapping extends QtiMappingBounds {
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
  strippedAttributes: string[];
  warnings: ComposerWarning[];
  /**
   * Additional elements to insert after the interaction element.
   * Useful for rubric blocks, feedback, etc.
   */
  additionalElements?: Element[];
}

export type ResponseProcessingKind = 'match_correct' | 'map_response' | 'map_response_point';

/**
 * Declaration of an authoring attribute on an interaction source element that
 * the compose pipeline strips from the emitted standard-QTI interaction. These
 * are editor-only attributes (e.g. `correct-response`, `score`,
 * `case-sensitive`, `area-mappings`) that the compose pipeline reads and then
 * strips — their values are folded into `qti-response-declaration` /
 * `qti-response-processing` instead.
 *
 * - A bare `string` names a single canonical source attribute to strip.
 * - The object form supports:
 *   - `aliases` — additional source attribute names treated as the same
 *     authoring attribute. Defensive net for raw-XML callers that bypass
 *     upstream renames (e.g. camelCase `correctResponse` / `correctAnswer`).
 *   - `mirror` — retained for backwards compatibility; no longer affects
 *     output (the editor emits standard QTI 3.0 with no `data-*` mirrors).
 */
export type StrippedAttribute =
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
  strippedAttributes: readonly StrippedAttribute[];
}

export interface InteractionComposerHandler {
  tagName: string;
  compose(sourceElement: Element, xmlDoc: Document): InteractionComposeResult;
}
