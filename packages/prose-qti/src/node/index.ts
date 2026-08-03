/* eslint-disable import/no-relative-packages -- intra-package imports; the rule misreads this
   monorepo's layout and 'fixes' them into specifiers that do not resolve. */
import { installNodeDom } from './dom.js';

/**
 * QTI ↔ ProseMirror conversion, ready to use in Node.
 *
 *     import { qti3ToPm, pmToQti3, htmlToPm, pmToHtml, validateHtml } from '@citolab/prose-qti/node';
 *
 * A subpath rather than a separate package: the conversion and the schema that defines it must never
 * be installable at versions that disagree, and splitting them is the surest way to arrange exactly
 * that. `linkedom` is only reached through this module, so a browser consumer importing
 * `@citolab/prose-qti` never pulls it into a bundle.
 *
 * The DOM is installed as an import side effect, deliberately. It is the one thing a consumer cannot
 * be expected to get right — the failure modes are silent and surface deep in the pipeline as errors
 * naming neither the DOM nor the missing API. See `dom.ts`.
 *
 * ## Verified
 *
 * All 17 ITEM regression fixtures roundtrip through `qti3ToPm` → `pmToQti3` in plain Node and
 * reproduce the same committed snapshots the browser tests assert against.
 *
 * ## Known limitations, both of which are someone else's defect
 *
 *   - **`@qti-components/*` dists use extensionless relative imports** (`./elements/qti-gap`), which
 *     Node's ESM resolver rejects. They are compiled with `moduleResolution: bundler`, which permits
 *     that and emits it verbatim. Until that build emits extensions, a Node consumer needs a resolve
 *     hook or a bundler. Nothing in this package can paper over it honestly.
 *   - **linkedom drops the `xmlns:xsi` declaration** on serialize, so emitted QTI is
 *     namespace-incomplete. The document model is unaffected.
 *
 * ## Not yet trustworthy
 *
 * `htmlToPm` round-trip identity does not hold on the regression corpus. Treat `validateHtml`
 * failures on match and associate as suspect — the result carries a `suspect` flag for exactly that.
 */
installNodeDom();

export { installNodeDom } from './dom.js';

export {
  qti3ToPm,
  pmToQti3,
  htmlToPm,
  pmToHtml,
  type ConvertOptions,
  type HtmlToPmOptions
} from '../item-roundtrip/convert.js';

export { validateHtml, type ValidationResult } from '../item-roundtrip/validate.js';

/**
 * Types only. `diffHtmlStructure` itself stays internal: `validateHtml` is the supported entry
 * point, and the diff's shape is still settling — it lost its `moved` kind once already. These two
 * are exported because `ValidationResult.changes` is typed with them, so a TypeScript consumer
 * cannot avoid naming them.
 */
export type { HtmlChange, HtmlChangeKind } from '../item-roundtrip/diff-html.js';

export { createQtiSchema, type CreateQtiSchemaOptions } from '../schema/create-qti-schema.js';
