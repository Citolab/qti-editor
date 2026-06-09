import type {
  CompatibilityDiff,
  CompatibilityDiffItem,
  CompatibilityDiffStatus,
  CompatibilityDiffSummary,
  CompatibilityMergeCandidate,
  CompatibilityMergeDecision,
  CompatibilityMergeEvaluation,
  CompatibilityReport,
} from '@qti-editor/interfaces';

/**
 * Classifies each item in a `CompatibilityReport` by severity into a
 * `CompatibilityDiff` with per-item statuses (`unchanged` | `normalized` |
 * `preserved` | `lossy` | `conflict`) and a rolled-up summary.
 */
export function buildCompatibilityDiff(report: CompatibilityReport): CompatibilityDiff {
  const items = report.items.map(item => ({
    id: item.id,
    label: item.label,
    status: classifyCounts(item.counts),
    counts: item.counts,
  }));

  const summary = items.reduce<CompatibilityDiffSummary>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { unchanged: 0, normalized: 0, preserved: 0, lossy: 0, conflict: 0 },
  );

  return {
    items,
    summary,
    hasLossyChanges: summary.lossy > 0 || summary.conflict > 0,
    hasPreservedContent: summary.preserved > 0,
  };
}

/**
 * Scores and ranks a set of document candidates by compatibility health,
 * selecting the one with the least data loss.
 *
 * Useful when multiple versions of a document are available (e.g. a local
 * snapshot and a remote copy) and you need to pick the safest one to load.
 * Returns the selected candidate, the rejected candidates with reasons, and
 * a diff across all candidates.
 */
export function mergeCompatibilityCandidates<TDocument>(
  candidates: CompatibilityMergeCandidate<TDocument>[],
): CompatibilityMergeDecision<TDocument> {
  if (candidates.length === 0) {
    throw new Error('mergeCompatibilityCandidates requires at least one candidate.');
  }

  const evaluations = candidates.map(candidate => evaluateCandidate(candidate));
  const sorted = [...evaluations].sort(compareEvaluations);
  const selected = sorted[0];
  const rejected = sorted.slice(1);

  const diff = buildCompatibilityDiff({
    items: evaluations.map(evaluation => ({
      id: evaluation.candidate.id,
      label: evaluation.candidate.label,
      changes: [],
      preservedFragments: [],
      counts: countsFromEvaluation(evaluation),
    })),
    counts: evaluations.reduce(
      (acc, evaluation) => {
        const counts = countsFromEvaluation(evaluation);
        acc.info += counts.info;
        acc.warning += counts.warning;
        acc.error += counts.error;
        acc.preservedFragments += counts.preservedFragments;
        return acc;
      },
      { info: 0, warning: 0, error: 0, preservedFragments: 0 },
    ),
    hasWarnings: evaluations.some(evaluation => ['normalized', 'preserved', 'conflict'].includes(evaluation.status)),
    hasErrors: evaluations.some(evaluation => ['lossy', 'conflict'].includes(evaluation.status)),
  });

  return {
    selected,
    rejected,
    diff,
  };
}

function evaluateCandidate<TDocument>(
  candidate: CompatibilityMergeCandidate<TDocument>,
): CompatibilityMergeEvaluation<TDocument> {
  const report = candidate.report;
  if (!report) {
    return {
      candidate,
      status: 'unchanged',
      score: 0,
      reason: 'Candidate has no compatibility report; treated as unchanged.',
    };
  }

  const diff = buildCompatibilityDiff(report);
  const hasMultipleDistinctStatuses = new Set(diff.items.map(item => item.status)).size > 1;
  const status = hasMultipleDistinctStatuses && diff.hasLossyChanges ? 'conflict' : classifyReport(report);
  const score = scoreReport(report, status, candidate.timestamp);

  return {
    candidate,
    status,
    score,
    reason: buildEvaluationReason(status, report),
  };
}

function compareEvaluations<TDocument>(
  left: CompatibilityMergeEvaluation<TDocument>,
  right: CompatibilityMergeEvaluation<TDocument>,
): number {
  if (left.score !== right.score) return left.score - right.score;
  return (right.candidate.timestamp ?? 0) - (left.candidate.timestamp ?? 0);
}

function classifyReport(report: CompatibilityReport): CompatibilityDiffStatus {
  return classifyCounts(report.counts);
}

function classifyCounts(counts: {
  info: number;
  warning: number;
  error: number;
  preservedFragments: number;
}): CompatibilityDiffStatus {
  if (counts.error > 0) return 'lossy';
  if (counts.preservedFragments > 0) return 'preserved';
  if (counts.warning > 0 || counts.info > 0) return 'normalized';
  return 'unchanged';
}

function scoreReport(
  report: CompatibilityReport,
  status: CompatibilityDiffStatus,
  timestamp?: number,
): number {
  const statusPenalty = {
    unchanged: 0,
    normalized: 100,
    preserved: 500,
    lossy: 1000,
    conflict: 1500,
  }[status];

  const timeBias = timestamp ? Math.max(0, 9999999999999 - timestamp) / 1_000_000_000_000 : 0;
  return statusPenalty
    + report.counts.error * 100
    + report.counts.preservedFragments * 10
    + report.counts.warning * 5
    + report.counts.info
    + timeBias;
}

function buildEvaluationReason(status: CompatibilityDiffStatus, report: CompatibilityReport): string {
  switch (status) {
    case 'unchanged':
      return 'Candidate has no compatibility changes.';
    case 'normalized':
      return `Candidate only required normalization (${report.counts.info} info / ${report.counts.warning} warnings).`;
    case 'preserved':
      return `Candidate preserved ${report.counts.preservedFragments} fragment(s) that may need manual review.`;
    case 'lossy':
      return `Candidate contains ${report.counts.error} lossy compatibility error(s).`;
    case 'conflict':
      return 'Candidate mixes preserved or lossy compatibility states and should be reviewed manually.';
  }
}

function countsFromEvaluation<TDocument>(
  evaluation: CompatibilityMergeEvaluation<TDocument>,
): CompatibilityDiffItem['counts'] {
  return evaluation.candidate.report?.counts ?? { info: 0, warning: 0, error: 0, preservedFragments: 0 };
}
