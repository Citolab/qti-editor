/* eslint-disable import/no-relative-packages -- these are intra-package imports; the rule
   misreads this monorepo's layout and 'fixes' them into specifiers that do not resolve. */
import { DOMParser as PMDOMParser, DOMSerializer } from 'prosemirror-model';

import { createQtiSchema } from '../schema/create-qti-schema.js';
import { exportItemXml } from './export.js';
import { importItemFromString } from './import.js';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import type { RoundtripImportOptions } from './import.js';

/**
 * The conversion surface, with the schema defaulted.
 *
 * `importItemFromString` / `exportItemXml` already did the work; what they lacked was a default
 * schema, so every caller built one and they drifted. These wrap them with `createQtiSchema()` and
 * add the HTML boundary — which already existed inside the pipeline (`roundtripXmlToPm` is really
 * XML → HTML → PM) but was not reachable from outside.
 *
 * ## Runs in Node
 *
 * Nothing here needs a browser, but it does need a DOM: `DOMParser`, `XMLSerializer`, `document`,
 * `document.implementation.createDocument`, and `HTMLElement` for the `getAttrs` guards. Provide
 * them from linkedom or jsdom before calling. prosemirror-model itself needs no shim — it already
 * accepts an injected document.
 *
 * Measured: every ITEM regression fixture roundtrips to its committed snapshot in plain Node —
 * 16/16 today, and the test reads the corpus off disk so the number follows the fixtures.
 *
 * ## Why HTML is a first-class boundary here
 *
 * Because generators produce HTML far more readily than XML, and HTML is what the custom-element
 * manifest describes. `htmlToPm` is the entry point that path needs.
 */

/** Everything the conversion functions accept in place of a hand-built schema. */
export interface ConvertOptions {
  /** Use this schema instead of the default. Must be built the `createQtiSchema` way. */
  schema?: Schema;
  /** Restrict the default schema to specific interactions, by tag name. */
  include?: string[];
}

/**
 * The default schema, built once.
 *
 * Memoised because ProseMirror compares node types by IDENTITY, not by name. Building a fresh
 * schema per call made every document incomparable with every other: `xmlToPm(x).eq(htmlToPm(y))`
 * was false even for byte-identical content, because the two docs' node types came from different
 * Schema instances. Measured — round-trip identity read 0/17 with a schema per call and 11/17 with
 * one shared instance, on exactly the same documents. (Measured on the 17-item corpus, before
 * ITEM017 left with the associate interaction; the ratio is historical, the conclusion is not.)
 *
 * It is also simply wasteful: the schema composes 42 node specs from every registered descriptor.
 *
 * A narrowed schema (`include`) is not cached — those are one-off by nature, and a caller wanting
 * to compare documents across calls should pass `schema` explicitly.
 */
let defaultSchema: Schema | undefined;

const schemaFor = (options: ConvertOptions = {}): Schema => {
  if (options.schema) return options.schema;
  if (options.include) return createQtiSchema({ include: options.include });
  defaultSchema ??= createQtiSchema();
  return defaultSchema;
};

/**
 * QTI 3 XML → ProseMirror document.
 *
 * Also accepts the editor's own roundtrip XML: the transform chain is idempotent, so feeding it
 * already-normalised input is a no-op rather than an error. Named for the common case, and paired
 * with `pmToQti3` so the two read as inverses.
 *
 * The default transform chain is enough: the schema makes `qtiPrompt` optional, matching the QTI
 * XSD, so an item that legitimately omits one parses as-is. There used to be an
 * `ensureInteractionPrompts` transform synthesising empty prompts to satisfy a schema that demanded
 * them, paired with a `stripEmptyPrompts` on export to take them out again. Making the prompt
 * optional removes both halves of that.
 */
export function qti3ToPm(xml: string, options: ConvertOptions & RoundtripImportOptions = {}): ProseMirrorNode {
  const { schema: _schema, include: _include, ...importOptions } = options;
  return importItemFromString(xml, schemaFor(options), importOptions);
}

/**
 * ProseMirror document → a complete QTI 3 assessment item.
 *
 * Not just the item body: the output is a `<qti-assessment-item>` with the QTI namespace and
 * schemaLocation, a `<qti-response-declaration>` per interaction carrying its correct response,
 * SCORE and MAXSCORE outcome declarations, and response processing. That is the whole point of the
 * roundtrip format — the editor stores `correct-response` and `score` as attributes while editing,
 * and this turns them back into the standard's declarations.
 *
 * Named for what it emits rather than `pmToXml`, which undersold it: callers read "some XML" and
 * went looking for a separate QTI step that already existed here.
 *
 */
export function pmToQti3(doc: ProseMirrorNode, options: ConvertOptions = {}): string {
  return exportItemXml(doc, schemaFor(options));
}

/**
 * ProseMirror document → HTML.
 *
 * The document's own attributes (`identifier`, `title`) are NOT emitted — they belong to the
 * assessment item, not the body — so a `pmToHtml` → `htmlToPm` round trip has to carry them
 * separately. `htmlToPm` takes them as options for exactly that reason.
 */
export function pmToHtml(doc: ProseMirrorNode, options: ConvertOptions = {}): string {
  const schema = schemaFor(options);
  const holder = document.createElement('div');
  holder.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document }));
  return holder.innerHTML;
}

export interface HtmlToPmOptions extends ConvertOptions {
  /** Document attributes, which HTML cannot carry. Both are required by the schema's doc node. */
  identifier?: string;
  title?: string;
}

/**
 * HTML → ProseMirror document.
 *
 * **This coerces rather than rejects.** ProseMirror's parser drops and lifts whatever does not fit
 * the schema, and never throws. So a successful call does not mean the input was valid — use
 * `validateHtml` when that is the question.
 */
export function htmlToPm(html: string, options: HtmlToPmOptions = {}): ProseMirrorNode {
  const schema = schemaFor(options);
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return PMDOMParser.fromSchema(schema).parse(holder, {
    topNode: schema.nodes.doc.create({
      identifier: options.identifier ?? 'ITEM',
      title: options.title ?? ''
    })
  });
}
