import { buildCompatibilityReport } from './report.js';

describe('compatibility report aggregation', () => {
  it('aggregates changes and preserved fragments across sources', () => {
    const report = buildCompatibilityReport([
      {
        id: 'one',
        result: {
          document: '<div></div>',
          sourceVersion: 1,
          targetVersion: 2,
          appliedStepIds: ['step-a'],
          metadata: { source: 'html' },
          changes: [
            { code: 'RENAME_ATTRIBUTE', severity: 'info', message: 'renamed' },
            { code: 'UNKNOWN_ATTRIBUTE_PRESERVED', severity: 'warning', message: 'preserved attr' },
          ],
          preservedFragments: [{ path: 'a[0]', reason: 'keep', payload: {} }],
        },
      },
      {
        id: 'two',
        result: {
          document: '<div></div>',
          sourceVersion: 1,
          targetVersion: 2,
          appliedStepIds: ['step-b'],
          metadata: { source: 'html' },
          changes: [
            { code: 'ATTRIBUTE_REMOVED', severity: 'warning', message: 'removed' },
            { code: 'STEP_APPLIED', severity: 'error', message: 'bad' },
          ],
          preservedFragments: [],
        },
      },
    ]);

    expect(report.counts).toEqual({
      info: 1,
      warning: 2,
      error: 1,
      preservedFragments: 1,
    });
    expect(report.hasWarnings).toBe(true);
    expect(report.hasErrors).toBe(true);
    expect(report.items).toHaveLength(2);
  });
});
