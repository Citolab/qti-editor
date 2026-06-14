/**
 * QTI 3.0 item → ProseMirror import.
 *
 * Composes the `@qti-editor/qti3-item-import` roundtrip transforms with the
 * `@qti-editor/interaction-shared` PM bridge. The transforms hoist canonical
 * authoring attributes (correct-response / score / …) onto each interaction and
 * reduce the document to a `<qti-item-body>`; `roundtripXmlToPm` then parses that
 * item-body into a ProseMirror document using the caller-supplied schema.
 *
 * The schema is always supplied by the caller because it is editor-specific
 * (built from the interaction descriptors a given editor understands). The
 * convenience this package adds is bundling the transform chain + PM bridge, not
 * hiding the schema.
 */

import {
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
} from '@qti-editor/qti3-item-import';
import { roundtripXmlToPm } from '@qti-editor/interaction-shared/roundtrip-xml-to-pm.js';

import { qtiTransformItem } from '@qti-components/transformers';

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

/** Apply asset path + roundtrip transforms + reduce-to-item-body, returning the item-body XMLDocument. */
function runRoundtrip(api: ReturnType<typeof qtiTransformItem>, options: RoundtripImportOptions): XMLDocument {
  let chain = api;
  if (options.assetBasePath != null) {
    chain = chain.path(options.assetBasePath);
  }
  const transforms = options.transforms ?? defaultRoundtripTransforms;
  for (const transform of transforms) {
    chain = chain.fn(transform);
  }
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
  const itemBody = runRoundtrip(qtiTransformItem().parse(xml), options);
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
  const api = await qtiTransformItem().load(url, options.signal);
  const assetBasePath = options.assetBasePath ?? url.substring(0, url.lastIndexOf('/'));
  const itemBody = runRoundtrip(api, { ...options, assetBasePath });
  return roundtripXmlToPm(itemBody, schema);
}
