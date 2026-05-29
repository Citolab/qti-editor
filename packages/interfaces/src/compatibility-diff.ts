import type { CompatibilityReport, CompatibilityReportCounts } from './compatibility-report.js';

export type CompatibilityDiffStatus =
  | 'unchanged'
  | 'normalized'
  | 'preserved'
  | 'lossy'
  | 'conflict';

export interface CompatibilityDiffItem {
  id: string;
  label?: string;
  status: CompatibilityDiffStatus;
  counts: CompatibilityReportCounts;
}

export interface CompatibilityDiffSummary {
  unchanged: number;
  normalized: number;
  preserved: number;
  lossy: number;
  conflict: number;
}

export interface CompatibilityDiff {
  items: CompatibilityDiffItem[];
  summary: CompatibilityDiffSummary;
  hasLossyChanges: boolean;
  hasPreservedContent: boolean;
}

export interface CompatibilityMergeCandidate<TDocument> {
  id: string;
  label?: string;
  document: TDocument;
  report?: CompatibilityReport;
  timestamp?: number;
}

export interface CompatibilityMergeEvaluation<TDocument> {
  candidate: CompatibilityMergeCandidate<TDocument>;
  status: CompatibilityDiffStatus;
  score: number;
  reason: string;
}

export interface CompatibilityMergeDecision<TDocument> {
  selected: CompatibilityMergeEvaluation<TDocument>;
  rejected: CompatibilityMergeEvaluation<TDocument>[];
  diff: CompatibilityDiff;
}
