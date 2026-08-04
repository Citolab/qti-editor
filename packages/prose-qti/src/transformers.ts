/*
 * `@qti-components/transformers`, re-exported so a consumer never names it.
 *
 * The QTI transform pipeline (`qtiTransformItem`, `qtiTransformTest`, …) is part of the surface an
 * editor host actually uses — loading an item, reading an assessment test — so hosts were declaring
 * `@qti-components/transformers` themselves. Under pnpm they had no choice: it is this package's
 * dependency, and an isolated `node_modules` will not let a consumer import what it has not
 * declared. Declaring it meant pinning a pkg.pr.new URL, which meant a sha the host had to remember
 * to bump. qti-editor-angular sat two builds behind on exactly this.
 *
 * Re-exporting moves that from the host to here. `@citolab/prose-qti/transformers` is the same
 * module by a name the host already depends on, so the pin lives in one repo and updates when this
 * package updates.
 *
 * `export *` rather than a curated list, deliberately: this is a forwarding seam, not an API
 * decision. Curating it would mean re-curating on every upstream addition, and a host that wanted
 * something unlisted would go straight back to declaring the dependency.
 */
export * from '@qti-components/transformers';
