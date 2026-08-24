import { CURRENT_SCHEMA_VERSION } from '@citolab/prose-qti/interfaces';

import type { SalvageOutcome, SchemaGapOutcome } from '@citolab/prose-qti/schema-recovery';
import type {
  CompatibilityReport,
  CompatibilityReportCounts,
  CompatibilityReportItem,
  MigrationResult,
} from '@citolab/prose-qti/interfaces';

/** A `MigrationResult` labelled for inclusion in a `CompatibilityReport`. */
export interface CompatibilityReportSource {
  id: string;
  label?: string;
  result: MigrationResult<unknown>;
}

/**
 * Aggregates one or more `MigrationResult`s into a single `CompatibilityReport`.
 *
 * Pass one source per loaded document or import item. The report's `counts`
 * roll up all severities across sources; `hasWarnings` / `hasErrors` are
 * convenience flags for conditional UI rendering.
 *
 * Dispatch the report via `qti:compatibility:report` on `document` so the
 * React layer can surface it to the user.
 */
export function buildCompatibilityReport(
  sources: CompatibilityReportSource[],
): CompatibilityReport {
  const items = sources.map(source => buildCompatibilityReportItem(source));
  const counts = items.reduce<CompatibilityReportCounts>(
    (acc, item) => ({
      info: acc.info + item.counts.info,
      warning: acc.warning + item.counts.warning,
      error: acc.error + item.counts.error,
      preservedFragments: acc.preservedFragments + item.counts.preservedFragments,
    }),
    emptyCounts(),
  );

  return {
    items,
    counts,
    hasWarnings: counts.warning > 0 || counts.preservedFragments > 0,
    hasErrors: counts.error > 0,
  };
}

/**
 * Wraps a salvaged document as a report source.
 *
 * The version numbers are the only thing this app adds to what the package returned, and they are the
 * one thing only this app knows. Salvage targets the current version by definition — it removed
 * precisely the content the current schema cannot hold — so a salvaged document is not a candidate for
 * further migration, and recording it as current is what keeps the ladder from being run over it
 * again.
 *
 * This used to be a `salvage.ts` beside the package's `salvage-json.ts`, which read as though the app
 * had its own salvage implementation. It is the same conversion `schemaGapReportSource` does for the
 * other outcome, so it belongs beside it.
 */
export function salvageReportSource(options: {
  id: string;
  label?: string;
  outcome: SalvageOutcome;
}): CompatibilityReportSource {
  return {
    id: options.id,
    label: options.label,
    result: {
      document: options.outcome.document,
      sourceVersion: CURRENT_SCHEMA_VERSION,
      targetVersion: CURRENT_SCHEMA_VERSION,
      changes: options.outcome.changes,
      preservedFragments: options.outcome.preservedFragments,
      appliedStepIds: ['salvage-unknown-schema-content'],
      metadata: { source: 'json', documentVersion: CURRENT_SCHEMA_VERSION, salvaged: true },
    },
  };
}

/**
 * Wraps a schema-gap scan as a report source.
 *
 * A gap scan is not a migration — nothing was changed and no version moved — but it produces exactly
 * the same news: content that could not be represented, preserved verbatim. Reporting it through the
 * same channel is what lets one notice speak for the restore path and the import path alike, which
 * is the point: the user does not care which door the loss came through.
 */
export function schemaGapReportSource(options: {
  id: string;
  label?: string;
  outcome: SchemaGapOutcome;
  source?: 'html' | 'xml';
}): CompatibilityReportSource {
  return {
    id: options.id,
    label: options.label,
    result: {
      document: null,
      sourceVersion: CURRENT_SCHEMA_VERSION,
      targetVersion: CURRENT_SCHEMA_VERSION,
      changes: options.outcome.changes,
      preservedFragments: options.outcome.preservedFragments,
      appliedStepIds: [],
      metadata: { source: options.source ?? 'xml', documentVersion: CURRENT_SCHEMA_VERSION },
    },
  };
}

/**
 * A report for a document that could not be read at all.
 *
 * The counterpart to a salvage report, and the reason both exist: every other report says what was
 * changed to make a document loadable, and this one says that nothing was — the file is untouched,
 * and there is nothing to show for it but the name and the reason. Reported through the same channel
 * so a refusal cannot be the one outcome with nowhere to appear.
 */
export function buildUnreadableDocumentReport(options: {
  id: string;
  label?: string;
  reason: string;
}): CompatibilityReport {
  return buildCompatibilityReport([{
    id: options.id,
    label: options.label,
    result: {
      document: null,
      sourceVersion: 0,
      targetVersion: 0,
      changes: [{
        code: 'DOCUMENT_UNREADABLE',
        severity: 'error',
        message: options.reason,
      }],
      preservedFragments: [],
      appliedStepIds: [],
      metadata: { source: 'json' },
    },
  }]);
}

function buildCompatibilityReportItem(source: CompatibilityReportSource): CompatibilityReportItem {
  const counts = source.result.changes.reduce<CompatibilityReportCounts>((acc, change) => {
    acc[change.severity] += 1;
    return acc;
  }, emptyCounts());
  counts.preservedFragments = source.result.preservedFragments.length;

  return {
    id: source.id,
    label: source.label,
    changes: source.result.changes,
    preservedFragments: source.result.preservedFragments,
    counts,
  };
}

function emptyCounts(): CompatibilityReportCounts {
  return {
    info: 0,
    warning: 0,
    error: 0,
    preservedFragments: 0,
  };
}
