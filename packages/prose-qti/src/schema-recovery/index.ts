/**
 * SCHEMA RECOVERY — what to do when content and schema disagree.
 *
 * Three questions, answered separately because hosts need them separately:
 *
 *   - *Is this document loadable?*        `findSchemaViolation`
 *   - *What can I keep of it?*            `salvageJsonDocument`
 *   - *What will parsing this DOM lose?*  `findUnrepresentableElements`
 *
 * plus the means to show the answer in the editor itself: `createRecoveryMarkerPlugin` marks the
 * places content was removed from, and `focusRecoverySite` takes the reader to one.
 *
 * Nothing here knows about QTI, storage, versions, or migration ladders. That is the host's
 * business: this layer only compares content against a schema and reports the difference. The
 * migration ladder that prevents most of these situations in the first place lives with whoever owns
 * the stored documents — for this editor, the app's own `src/lib/compatibility/` (which lives in
 * the `qti-editor-full-assessment` repository, not here).
 */

export { findSchemaViolation, type SchemaViolation } from './validate.js';
export { salvageJsonDocument } from './salvage-json.js';
export {
  findUnrepresentableElements,
  TRANSPARENT_WRAPPER_TAGS,
  type FindUnrepresentableOptions,
} from './salvage-dom.js';
export { resolveRecoverySites, type ResolvedRecoverySite } from './recovery-sites.js';
export {
  clearRecoverySites,
  createRecoveryMarkerPlugin,
  focusRecoverySite,
  listRecoverySites,
  recoveryMarkerPluginKey,
  setRecoverySites,
  type RecoveryMarkerOptions,
  type RecoveryMarkerState,
} from './recovery-marker-plugin.js';
export { collectExcerpt } from './excerpt.js';
export { mergeSchemaGapOutcomes } from './merge.js';
export { withHostMessage } from './messages.js';
export {
  excerptOf,
  recoveryKindOf,
  siteIdOf,
  type NodeJson,
  type RecoveryChange,
  type RecoveryChangeKind,
  type RecoveryMessageOptions,
  type RecoveryMessageResolver,
  type RecoverySite,
  type RecoverySiteKind,
  type SalvageOutcome,
  type SchemaGapOutcome,
} from './types.js';
