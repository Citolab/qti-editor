import type { SchemaGapOutcome } from './types.js';

/**
 * Combine several gap scans into one outcome.
 *
 * A host may have more than one thing to scan — the item body against the
 * schema, and the surrounding item's response processing against the editor's
 * scoring models — but the reader wants one notice, not two. Keeping the result a
 * single `SchemaGapOutcome` also means the report plumbing takes one input, so
 * adding a scan does not ripple through `schemaGapReportSource` and its callers.
 *
 * Order is preserved: pass the scans in the order the findings should read.
 */
export function mergeSchemaGapOutcomes(...outcomes: SchemaGapOutcome[]): SchemaGapOutcome {
  return {
    changes: outcomes.flatMap(outcome => outcome.changes),
    preservedFragments: outcomes.flatMap(outcome => outcome.preservedFragments),
  };
}
