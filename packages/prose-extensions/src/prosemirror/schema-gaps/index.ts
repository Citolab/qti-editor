/**
 * SCHEMA GAPS — what a schema cannot represent in markup it is about to parse.
 *
 * One question: *what will parsing this DOM lose?* — `findUnrepresentableElements`.
 *
 * ProseMirror's `DOMParser` is silently lenient: an element no `parseDOM` rule matches is skipped
 * and its children are parsed in its place. That is the right behaviour — losing a wrapper beats
 * losing a document — but it is invisible, so importing markup into an editor whose schema models a
 * subset of it drops content with no error, no warning and no trace. This is the missing half.
 *
 * It lives in this package because it knows nothing about QTI: it takes a `Schema` and an `Element`
 * and reports the difference. Every import in it is `import type`, `prosemirror-model` included, so
 * it has no runtime dependencies at all.
 *
 * ## What it deliberately does not ship
 *
 * **A notice.** Saying the news is the consumer's job, and the shape of that answer is theirs too — a
 * banner, a log line, a dialog, a row in an existing panel. What this exports is the data to say it
 * with: `SchemaGapOutcome.changes` carries a `kind`, a `code`, the tag name and an excerpt of the
 * author's own text, and `getMessage` replaces the English on any of them. See
 * `apps/qti-example-editor/src/components/schema-gap-notice.ts` for one implementation.
 *
 * **A dependency of any kind.** Including on `@citolab/prose-qti`, which is why `TRANSPARENT_WRAPPER_TAGS`
 * lives here despite naming one QTI tag: it is a list of strings, and splitting it across two
 * packages to keep this one pure cost more than the purity was worth. See its docblock in `scan.ts`.
 */

export {
  findUnrepresentableElements,
  TRANSPARENT_WRAPPER_TAGS,
  type FindUnrepresentableOptions,
} from './scan.js';
export { withHostMessage } from './messages.js';
export {
  type SchemaGapChange,
  type SchemaGapCode,
  type SchemaGapFragment,
  type SchemaGapKind,
  type SchemaGapMessageOptions,
  type SchemaGapMessageResolver,
  type SchemaGapOutcome,
  type SchemaGapSeverity,
} from './types.js';
