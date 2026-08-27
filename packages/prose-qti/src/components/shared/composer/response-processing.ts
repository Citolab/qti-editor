/**
 * RESPONSE PROCESSING as authoring data.
 *
 * The scoring model used to be a constant per interaction TYPE — a
 * `responseProcessing.internalKind` in each interaction's `composer/metadata.ts`.
 * Real items choose it per response declaration, so that constant overwrote the
 * item's own choice on export: a mapping-scored choice interaction came back out
 * as all-or-nothing `match_correct`, losing its per-option values.
 *
 * So the kind and the mapping are now read off the source element, and the
 * type's `internalKind` is only the default for when the element says nothing —
 * which is every item the editor authors from scratch.
 *
 * Shared rather than repeated: nine interactions need identical reading, one
 * reconciler and one URI table, and nine copies of each is how they drift.
 */

import type {
  ComposerWarning,
  InteractionComposerMetadata,
  QtiMappingBounds,
  QtiStringMapping,
  ResponseProcessingKind,
} from '@citolab/prose-qti/interfaces';

/**
 * The canonical URI for each standard template.
 *
 * One table, because this literal was duplicated eight times across
 * `core/composer/index.ts` and seven `composer/metadata.ts` files — and had
 * already drifted, select-point emitting the `.xml` form while nothing else did.
 * The runtime strips `.xml` when resolving, so both forms work; emitting one form
 * consistently is for the humans reading the output.
 */
export const RESPONSE_PROCESSING_TEMPLATE_URIS: Record<ResponseProcessingKind, string> = {
  match_correct: 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct',
  map_response: 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response',
  map_response_point: 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point',
};

export function templateUriForKind(kind: ResponseProcessingKind): string {
  return RESPONSE_PROCESSING_TEMPLATE_URIS[kind];
}

const RESPONSE_PROCESSING_KINDS = new Set<string>(Object.keys(RESPONSE_PROCESSING_TEMPLATE_URIS));

export interface ResolvedResponseProcessing {
  kind: ResponseProcessingKind | undefined;
  mapping: QtiStringMapping | undefined;
  warnings: ComposerWarning[];
}

/**
 * Read `response-processing` and `response-mapping` off an interaction element.
 *
 * Falls back to the interaction type's own kind, so an element that says nothing
 * behaves exactly as it did before these attributes existed.
 */
export function readResponseProcessing(
  sourceElement: Element,
  metadata: Pick<InteractionComposerMetadata, 'tagName' | 'responseProcessing'>,
): ResolvedResponseProcessing {
  const warnings: ComposerWarning[] = [];

  const declaredKind = sourceElement.getAttribute('response-processing')?.trim();
  let kind = metadata.responseProcessing.internalKind;

  if (declaredKind) {
    if (RESPONSE_PROCESSING_KINDS.has(declaredKind)) {
      kind = declaredKind as ResponseProcessingKind;
    } else {
      warnings.push({
        code: 'RESPONSE_PROCESSING_KIND_MISMATCH',
        message: `Unknown response-processing "${declaredKind}" on ${metadata.tagName}; falling back to ${
          kind ?? 'none'
        }.`,
        tagName: metadata.tagName,
      });
    }
  }

  const parsed = parseMappingAttribute(sourceElement.getAttribute('response-mapping'), metadata.tagName);
  warnings.push(...parsed.warnings);

  return { kind, mapping: parsed.mapping, warnings };
}

/**
 * Parse the `response-mapping` JSON authoring attribute.
 *
 * JSON rather than a comma-separated string for the same reason select-point's
 * `area-mappings` is: per-key values plus three bound attributes do not fit in a
 * flat list.
 */
export function parseMappingAttribute(
  raw: string | null,
  tagName: string,
): { mapping: QtiStringMapping | undefined; warnings: ComposerWarning[] } {
  if (!raw || raw.trim().length === 0) return { mapping: undefined, warnings: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      mapping: undefined,
      warnings: [
        {
          code: 'INVALID_MAPPING_JSON',
          message: `response-mapping on ${tagName} is not valid JSON; the mapping is ignored.`,
          tagName,
        },
      ],
    };
  }

  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      mapping: undefined,
      warnings: [
        {
          code: 'INVALID_MAPPING_JSON',
          message: `response-mapping on ${tagName} must be an object; the mapping is ignored.`,
          tagName,
        },
      ],
    };
  }

  const record = parsed as Record<string, unknown>;
  const warnings: ComposerWarning[] = [];

  const entries = (Array.isArray(record.entries) ? record.entries : [])
    .map((candidate, index) => {
      if (candidate == null || typeof candidate !== 'object') return null;
      const entry = candidate as Record<string, unknown>;
      const mapKey = typeof entry.mapKey === 'string' ? entry.mapKey : null;
      const mappedValue = toFiniteNumber(entry.mappedValue);

      if (mapKey == null || mappedValue == null) {
        warnings.push({
          code: 'INVALID_MAPPING_ENTRY',
          message: `response-mapping entry ${index} on ${tagName} needs a mapKey and a numeric mappedValue; it is skipped.`,
          tagName,
        });
        return null;
      }

      return {
        mapKey,
        mappedValue,
        ...(typeof entry.caseSensitive === 'boolean' ? { caseSensitive: entry.caseSensitive } : {}),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (entries.length === 0) return { mapping: undefined, warnings };

  return {
    mapping: {
      defaultValue: toFiniteNumber(record.defaultValue) ?? 0,
      lowerBound: toFiniteNumber(record.lowerBound),
      upperBound: toFiniteNumber(record.upperBound),
      entries,
    },
    warnings,
  };
}

export function serializeMappingAttribute(mapping: QtiStringMapping): string {
  return JSON.stringify({
    defaultValue: mapping.defaultValue,
    ...(mapping.lowerBound == null ? {} : { lowerBound: mapping.lowerBound }),
    ...(mapping.upperBound == null ? {} : { upperBound: mapping.upperBound }),
    entries: mapping.entries,
  });
}

/**
 * Prune mapping entries whose key no longer names anything in the interaction.
 *
 * The mapping is stored on the element while the options live in its children,
 * so deleting a choice leaves an entry keyed on an identifier that is gone. That
 * entry would silently mis-score, so it is dropped and said out loud.
 *
 * Deliberately does NOT reconcile against the correct response. ITEM002's
 * mapping gives `choice3` a −1 precisely *because* it is the wrong answer, so
 * forcing the two to agree would delete the penalty — the exact loss this work
 * exists to fix. Keys with no entry are also left alone: `default-value` is QTI's
 * own mechanism for "everything else".
 */
export function pruneStaleMappingEntries(
  mapping: QtiStringMapping,
  knownKeys: ReadonlySet<string> | null,
  tagName: string,
): { mapping: QtiStringMapping; warnings: ComposerWarning[] } {
  // No enumerable key set — text-entry's keys are arbitrary strings, so there is
  // nothing to check against.
  if (knownKeys == null || knownKeys.size === 0) return { mapping, warnings: [] };

  const warnings: ComposerWarning[] = [];
  const kept = mapping.entries.filter(entry => {
    if (knownKeys.has(entry.mapKey)) return true;
    warnings.push({
      code: 'MAPPING_ENTRY_STALE',
      message: `response-mapping on ${tagName} scores "${entry.mapKey}", which no longer exists in this interaction; the entry is dropped.`,
      tagName,
    });
    return false;
  });

  if (warnings.length === 0) return { mapping, warnings };
  return { mapping: { ...mapping, entries: kept }, warnings };
}

/**
 * Build the mapping a `map_response` declaration needs when the author supplied
 * none, from the answer key and the interaction's weight.
 *
 * Needed because kind `map_response` with no mapping is a runtime *fault*, not
 * merely lossy: `qti-map-response` over a mapping-less declaration makes the
 * runtime log an error and score nothing.
 */
export function mappingFromCorrectResponse(
  correctResponse: string | string[] | undefined,
  score: number,
  bounds: QtiMappingBounds = {},
): QtiStringMapping | undefined {
  const keys = (Array.isArray(correctResponse) ? correctResponse : [correctResponse])
    .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
    .map(key => key.trim());

  if (keys.length === 0) return undefined;

  return {
    defaultValue: 0,
    lowerBound: bounds.lowerBound ?? null,
    upperBound: bounds.upperBound ?? null,
    entries: keys.map(mapKey => ({ mapKey, mappedValue: score })),
  };
}

/**
 * The option identifiers an interaction actually offers, for stale-key pruning.
 *
 * Returns `null` when the interaction has no enumerable key set — text-entry
 * keys on arbitrary strings, and the pair-based interactions key on
 * `"source target"` combinations rather than on a child's identifier. `null`
 * means "cannot check", which is different from "checked and found nothing".
 */
export function optionIdentifiersOf(element: Element, childTags: readonly string[]): Set<string> | null {
  if (childTags.length === 0) return null;

  const identifiers = new Set<string>();
  for (const tag of childTags) {
    for (const child of Array.from(element.querySelectorAll(tag))) {
      const identifier = child.getAttribute('identifier');
      if (identifier) identifiers.add(identifier);
    }
  }
  return identifiers.size > 0 ? identifiers : null;
}

/**
 * Settle the scoring model for one declaration.
 *
 * Every rule about how `score`, `correct-response` and a mapping relate lives
 * here, so the nine interactions cannot disagree about it. In precedence order:
 *
 * 1. An explicit `response-mapping` attribute.
 * 2. Whatever the interaction's own compose step built (text-entry's synthesis
 *    from the accepted spellings, which is the one place `score` legitimately
 *    drives a mapping).
 * 3. A mapping derived from the answer key — needed because kind
 *    `map_response` with no mapping makes the runtime log an error and score
 *    nothing, so it is a fault rather than a lossy approximation.
 *
 * If none of those yields a mapping the kind is downgraded rather than emitted
 * broken.
 */
export function normalizeDeclarationScoring<T extends {
  correctResponse?: string | string[];
  stringMapping?: QtiStringMapping;
  score?: number;
}>(options: {
  declaration: T;
  resolved: ResolvedResponseProcessing;
  knownKeys?: ReadonlySet<string> | null;
  tagName: string;
}): { declaration: T; kind: ResponseProcessingKind | undefined; warnings: ComposerWarning[] } {
  const { declaration, resolved, knownKeys = null, tagName } = options;
  const warnings = [...resolved.warnings];
  const kind = resolved.kind;

  if (kind !== 'map_response') {
    // `map_response_point` keeps its area mapping, which select-point owns. A
    // `match_correct` declaration keeps any mapping it arrived with — it is dead
    // weight in delivery, since the written-out condition is what runs, but it
    // came from the source and dropping it would be the very loss being fixed.
    const mapping = resolved.mapping ?? declaration.stringMapping;
    return {
      declaration: mapping ? { ...declaration, stringMapping: mapping } : declaration,
      kind,
      warnings,
    };
  }

  let mapping =
    resolved.mapping ??
    declaration.stringMapping ??
    mappingFromCorrectResponse(declaration.correctResponse, declaration.score ?? 1);

  if (!mapping) {
    warnings.push({
      code: 'RESPONSE_PROCESSING_KIND_MISMATCH',
      message: `${tagName} is set to map_response but has no mapping and no correct response to derive one from; scoring falls back to match_correct.`,
      tagName,
    });
    return { declaration, kind: 'match_correct', warnings };
  }

  const pruned = pruneStaleMappingEntries(mapping, knownKeys, tagName);
  warnings.push(...pruned.warnings);
  mapping = pruned.mapping;

  // Pruning can empty the mapping, and an empty `qti-mapping` scores nothing.
  if (mapping.entries.length === 0) {
    const derived = mappingFromCorrectResponse(declaration.correctResponse, declaration.score ?? 1);
    if (!derived) return { declaration, kind: 'match_correct', warnings };
    mapping = derived;
  }

  return { declaration: { ...declaration, stringMapping: mapping }, kind, warnings };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
