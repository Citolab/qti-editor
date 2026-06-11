/**
 * Re-exports the unified non-QTI attribute helpers from
 * `@qti-editor/interactions/shared`. The helpers live there (not here) so that
 * per-interaction `.compose.ts` files can call them without creating a
 * package-level circular dependency on `@qti-editor/qti-core` (which depends
 * on all the interaction packages via the registry).
 *
 * Consumers should import from `@qti-editor/qti-core/composer` — this file is
 * an implementation detail that keeps the existing public API stable.
 */

export {
  getNonQtiAttributeSources,
  normalizeNonQtiAttribute,
  stripNonQtiAttributesFromElement,
} from '@qti-editor/interaction-shared';
export type { NonQtiAttributeEntry } from '@qti-editor/interaction-shared';
