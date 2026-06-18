/**
 * Shared types for schema compatibility, document migration, and preservation.
 *
 * Pure TypeScript — no runtime dependencies.
 */
/**
 * The single, unified document schema version targeted by both the JSON and
 * HTML migration pipelines. Bump this when a new migration step is added and
 * register the matching step in the migrations module.
 *
 * Version history:
 *   v1 — Baseline (no version marker).
 *   v2 — Normalize legacy hyphenated/camelCase attribute names.
 *   v3 — Rename correctResponse → rubricScoringBlock on qtiExtendedTextInteraction.
 *   v4 — Lift rubricScoringBlock into a sibling qtiRubricBlock node.
 *   v5 — Convert prosekit flat `list` nodes to bullet_list/ordered_list + list_item.
 *   v6 — Convert legacy `bold`/`italic` marks to `strong`/`em`.
 */
export const CURRENT_SCHEMA_VERSION = 6;
