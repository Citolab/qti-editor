/**
 * Re-exports the unified stripped attribute helpers from
 * `@qti-editor/interactions/shared`. The helpers live there (not here) so that
 * per-interaction `.compose.ts` files can call them without creating a
 * package-level circular dependency on `@qti-editor/qti-core` (which depends
 * on all the interaction packages via the registry).
 *
 * Consumers should import from `@qti-editor/qti-core/composer` — this file is
 * an implementation detail that keeps the existing public API stable.
 */

export {
  getStrippedAttributeSources,
  normalizeStrippedAttribute,
  stripAttributesFromElement,
} from '@qti-editor/interaction-shared';
export type { StrippedAttributeEntry } from '@qti-editor/interaction-shared';
