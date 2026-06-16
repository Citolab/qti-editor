import type {
  CompatibilityReport,
  CompatibilityReportCounts,
  CompatibilityReportItem,
  MigrationResult,
} from '@qti-editor/interfaces';

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
