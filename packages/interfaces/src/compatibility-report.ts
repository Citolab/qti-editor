import type { CompatibilityChange, PreservedFragment } from './compatibility.js';

export interface CompatibilityReportCounts {
  info: number;
  warning: number;
  error: number;
  preservedFragments: number;
}

export interface CompatibilityReportItem {
  id: string;
  label?: string;
  changes: CompatibilityChange[];
  preservedFragments: PreservedFragment[];
  counts: CompatibilityReportCounts;
}

export interface CompatibilityReport {
  items: CompatibilityReportItem[];
  counts: CompatibilityReportCounts;
  hasWarnings: boolean;
  hasErrors: boolean;
}
