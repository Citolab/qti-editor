/*
 * QTI Editor Kit
 *
 * Supported editor assembly surfaces for QTI editing.
 *
 * ProseKit-dependent surfaces (code panel, events, interaction registration)
 * are intentionally NOT re-exported here: `prosekit` is an optional peer
 * dependency, and this barrel is reachable from the package root, so an
 * unconditional re-export here would force-evaluate `prosekit/core` for
 * every consumer, optional or not. Import those from their own subpaths
 * instead: `@citolab/prose-qti/integration/code`,
 * `@citolab/prose-qti/integration/events`,
 * `@citolab/prose-qti/integration/interactions/prosekit`.
 */

export type { QtiDocumentJson, QtiNodeJson } from './types.js';
export * from './item-context/index.js';
export { xmlFromNode, xmlToHTML } from './save-xml/index.js';
export {
  qtiItemFromProsemirror,
  type QtiComposeContext,
} from './save-qti-item/index.js';
