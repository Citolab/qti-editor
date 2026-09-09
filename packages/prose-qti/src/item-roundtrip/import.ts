/**
 * QTI 3.0 item → ProseMirror import.
 *
 * Composes the `@citolab/prose-qti/qti3-item-import` roundtrip transforms with the
 * `@citolab/prose-qti/components/shared` PM bridge. The transforms hoist canonical
 * authoring attributes (correct-response / score / …) onto each interaction and
 * reduce the document to a `<qti-item-body>`; `roundtripXmlToPm` then parses that
 * item-body into a ProseMirror document using the caller-supplied schema.
 *
 * The schema is always supplied by the caller because it is editor-specific
 * (built from the interaction descriptors a given editor understands). The
 * convenience this package adds is bundling the transform chain + PM bridge, not
 * hiding the schema.
 */

import { roundtripXmlToPm } from '@citolab/prose-qti/components/shared/roundtrip-xml-to-pm.js';
import {
  findUnrepresentableResponseProcessing,
  reduceToItemBody,
  roundtripChoice,
  roundtripExtendedText,
  roundtripInteractions,
  roundtripItemBody,
  roundtripMatch,
  roundtripGapMatch,
  roundtripOrder,
  roundtripSelectPoint,
  roundtripTextEntry,
} from "@citolab/prose-qti/qti3-item-import";

import { qtiTransformItem } from '@qti-components/transformers';

import type {
  SchemaGapMessageOptions,
  SchemaGapOutcome,
} from '@citolab/prose-extensions/schema-gaps';
import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

/** A roundtrip transform that mutates the parsed QTI item document in place. */
export type RoundtripTransform = (xmlDoc: XMLDocument) => void;

/**
 * The default roundtrip transform chain. The per-type transforms run first
 * (they carry type-specific behaviour), then a generic fallback hoists
 * correct-response / score onto any remaining interaction. All transforms are
 * idempotent, so subsetting or reordering never affects correctness.
 */
export const defaultRoundtripTransforms: readonly RoundtripTransform[] = [
  roundtripChoice,
  roundtripTextEntry,
  roundtripExtendedText,
  roundtripMatch,
  roundtripGapMatch,
  roundtripOrder,
  roundtripSelectPoint,
  roundtripInteractions,
  roundtripItemBody,
];

export interface RoundtripImportOptions {
  /**
   * Base path used to rewrite relative asset URLs (e.g. `<img src>`) so they
   * resolve at runtime. Applied via the transform pipeline's `.path(...)`.
   */
  assetBasePath?: string;
  /**
   * The roundtrip transforms to run before reducing to the item-body. Defaults
   * to {@link defaultRoundtripTransforms}. `reduceToItemBody` is always applied
   * last regardless of this list.
   */
  transforms?: readonly RoundtripTransform[];
}

/**
 * Apply asset path + roundtrip transforms + reduce-to-item-body, returning the item-body XMLDocument.
 *
 * `onFullItem` is the one chance anybody gets to look at the surrounding `<qti-assessment-item>`.
 * `reduceToItemBody` makes the item-body the document element and drops the rest — the response and
 * outcome declarations, and the response processing — so a caller holding this function's return
 * value cannot ask about them afterwards, no matter what it is willing to do. Anything that needs
 * the whole item has to be handed it here, mid-pipeline.
 */
function runRoundtrip(
  api: ReturnType<typeof qtiTransformItem>,
  options: RoundtripImportOptions,
  onFullItem?: (itemDoc: XMLDocument) => void,
): XMLDocument {
  let chain = api;
  if (options.assetBasePath != null) {
    chain = chain.path(options.assetBasePath);
  }
  const transforms = options.transforms ?? defaultRoundtripTransforms;
  for (const transform of transforms) {
    chain = chain.fn(transform);
  }
  // Transformed but not yet reduced: the interactions have their canonical attributes and the item
  // root is still there. Scanning after the transforms rather than before is deliberate — a
  // transform that folded scoring onto an interaction has made that scoring representable, and
  // reporting it as lost would be a false alarm.
  onFullItem?.(chain.xmlDoc());
  // `reduceToItemBody` is always applied so the document element is the
  // `<qti-item-body>` that `roundtripXmlToPm` expects.
  return chain.fn(reduceToItemBody).xmlDoc();
}

/**
 * Import an already-parsed QTI item-body `XMLDocument` into a ProseMirror
 * document. Low-level entry point: the document is expected to still be a full
 * QTI item — the roundtrip transforms (including `reduceToItemBody`) are run
 * here. Use this when you already have an `XMLDocument` in hand; otherwise
 * prefer {@link importItemFromString} or {@link importItemFromUrl}.
 */
export function importItemXmlDoc(
  xmlDoc: XMLDocument,
  schema: Schema,
  options: RoundtripImportOptions = {},
): ProseMirrorNode {
  const itemBody = runRoundtrip(qtiTransformItem().parse(new XMLSerializer().serializeToString(xmlDoc)), options);
  return roundtripXmlToPm(itemBody, schema);
}

/** Import a QTI 3.0 item XML string into a ProseMirror document. */
export function importItemFromString(
  xml: string,
  schema: Schema,
  options: RoundtripImportOptions = {},
): ProseMirrorNode {
  return parseItemBody(itemBodyFromString(xml, options), schema);
}

/**
 * The transformed `<qti-item-body>` an import is about to parse, without parsing it.
 *
 * Split out because parsing is where content goes missing and there is no way to ask afterwards
 * what was lost: ProseMirror's `DOMParser` drops what its schema cannot match and reports nothing.
 * An editor whose schema models a subset of QTI — every editor — needs to compare the two, so it
 * needs the input in hand:
 *
 * ```ts
 * import { findUnrepresentableElements, TRANSPARENT_WRAPPER_TAGS }
 *   from '@citolab/prose-extensions/schema-gaps';
 *
 * const itemBody = itemBodyFromString(xml, options);
 * const gaps = findUnrepresentableElements(schema, itemBody.documentElement, {
 *   ignoreTags: TRANSPARENT_WRAPPER_TAGS,
 * });
 * const doc = parseItemBody(itemBody, schema);
 * ```
 *
 * Both the scan and the wrapper list are the extension's, not this package's — one module owns that
 * question. This module owns getting you the `<qti-item-body>` to ask it about.
 *
 * Callers with no such interest should keep using `importItemFromString`, which is this pair.
 */
export function itemBodyFromString(xml: string, options: RoundtripImportOptions = {}): XMLDocument {
  return runRoundtrip(qtiTransformItem().parse(xml), options);
}

/** An item body, plus what the editor's scoring models could not represent in the item around it. */
export interface ItemBodyAndScoringGaps {
  itemBody: XMLDocument;
  /**
   * Response processing this editor cannot model. A `SchemaGapOutcome`, the same shape
   * `findUnrepresentableElements` returns, so one notice can speak for both losses — the reader does
   * not care which door content went out of.
   */
  scoringGaps: SchemaGapOutcome;
}

export interface ItemBodyAndScoringGapsOptions extends RoundtripImportOptions, SchemaGapMessageOptions {
  /** Longest quoted excerpt per reported scoring rule. Default 80. */
  excerptLimit?: number;
}

/**
 * The item body *and* what the item's scoring cost, which is the only way to get the second one.
 *
 * The editor holds three scoring models — `match_correct`, `map_response`, `map_response_point` —
 * and QTI response processing is a general-purpose program. Anything outside those three is dropped
 * on import, and was dropped **silently**: an item scored by a template this editor does not know
 * imports looking perfectly fine, exports as a complete item, and is worth zero marks.
 *
 * Reporting it needs the whole `<qti-assessment-item>`, and `itemBodyFromString` cannot give you
 * that — `reduceToItemBody` has already discarded the root by the time it returns. That is why this
 * exists as a separate entry point rather than as something a caller could assemble: the data is
 * gone before any caller gets a value back. See `runRoundtrip`.
 *
 * ```ts
 * const { itemBody, scoringGaps } = itemBodyAndGapsFromString(xml);
 * const elementGaps = findUnrepresentableElements(schema, itemBody.documentElement, {
 *   ignoreTags: TRANSPARENT_WRAPPER_TAGS,
 * });
 * const doc = parseItemBody(itemBody, schema);
 * ```
 *
 * The two outcomes are separate because they answer to different inputs — one to the caller's
 * schema, one to the editor's scoring models — and combining them is a one-line spread the caller
 * does when it wants a single notice.
 *
 * Silence is the expected result. All sixteen Kennisnet sample items are scored by the three
 * standard models, and that matters: a notice that fires on every import teaches the reader to
 * dismiss it, and the next one — the one about real loss — goes with it.
 */
export function itemBodyAndGapsFromString(
  xml: string,
  options: ItemBodyAndScoringGapsOptions = {},
): ItemBodyAndScoringGaps {
  let scoringGaps: SchemaGapOutcome = { changes: [], preservedFragments: [] };
  const itemBody = runRoundtrip(qtiTransformItem().parse(xml), options, itemDoc => {
    scoringGaps = findUnrepresentableResponseProcessing(itemDoc, options);
  });
  return { itemBody, scoringGaps };
}

/**
 * The URL counterpart of {@link itemBodyAndGapsFromString}. See it for why this pairing exists.
 */
export async function itemBodyAndGapsFromUrl(
  url: string,
  options: ItemBodyAndScoringGapsOptions & { signal?: AbortSignal } = {},
): Promise<ItemBodyAndScoringGaps> {
  const api = await qtiTransformItem().load(url, options.signal);
  const assetBasePath = options.assetBasePath ?? url.substring(0, url.lastIndexOf('/'));

  let scoringGaps: SchemaGapOutcome = { changes: [], preservedFragments: [] };
  const itemBody = runRoundtrip(api, { ...options, assetBasePath }, itemDoc => {
    scoringGaps = findUnrepresentableResponseProcessing(itemDoc, options);
  });
  return { itemBody, scoringGaps };
}

/**
 * Parse a transformed `<qti-item-body>` into a ProseMirror document.
 *
 * The second half of {@link itemBodyFromString}. Takes the item body as-is — the transforms have
 * already run, and running them again is the caller's business, not this function's.
 */
export function parseItemBody(itemBody: XMLDocument, schema: Schema): ProseMirrorNode {
  return roundtripXmlToPm(itemBody, schema);
}

/**
 * Import a QTI 3.0 item from a URL into a ProseMirror document. Fetches the XML
 * via the transform pipeline's async loader (`qti-transform` `.load(...)`).
 *
 * The asset base path defaults to the URL's directory so relative `<img src>`
 * URLs resolve at runtime; pass `options.assetBasePath` to override.
 */
export async function importItemFromUrl(
  url: string,
  schema: Schema,
  options: RoundtripImportOptions & { signal?: AbortSignal } = {},
): Promise<ProseMirrorNode> {
  return parseItemBody(await itemBodyFromUrl(url, options), schema);
}

/**
 * The transformed `<qti-item-body>` a URL import is about to parse, without parsing it. See
 * {@link itemBodyFromString} for why the two halves are separable.
 */
export async function itemBodyFromUrl(
  url: string,
  options: RoundtripImportOptions & { signal?: AbortSignal } = {},
): Promise<XMLDocument> {
  const api = await qtiTransformItem().load(url, options.signal);
  const assetBasePath = options.assetBasePath ?? url.substring(0, url.lastIndexOf('/'));
  return runRoundtrip(api, { ...options, assetBasePath });
}
