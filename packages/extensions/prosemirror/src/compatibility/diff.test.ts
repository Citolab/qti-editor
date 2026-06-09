import { buildCompatibilityDiff, mergeCompatibilityCandidates } from './diff.js';

describe('compatibility diff utilities', () => {
  it('classifies compatibility report items by severity', () => {
    const diff = buildCompatibilityDiff({
      items: [
        {
          id: 'one',
          changes: [],
          preservedFragments: [],
          counts: { info: 0, warning: 0, error: 0, preservedFragments: 0 },
        },
        {
          id: 'two',
          changes: [],
          preservedFragments: [],
          counts: { info: 1, warning: 0, error: 0, preservedFragments: 0 },
        },
        {
          id: 'three',
          changes: [],
          preservedFragments: [{} as never],
          counts: { info: 0, warning: 1, error: 0, preservedFragments: 1 },
        },
        {
          id: 'four',
          changes: [],
          preservedFragments: [],
          counts: { info: 0, warning: 0, error: 1, preservedFragments: 0 },
        },
      ],
      counts: { info: 1, warning: 1, error: 1, preservedFragments: 1 },
      hasWarnings: true,
      hasErrors: true,
    });

    expect(diff.summary).toEqual({
      unchanged: 1,
      normalized: 1,
      preserved: 1,
      lossy: 1,
      conflict: 0,
    });
  });

  it('selects the safest candidate during merge evaluation', () => {
    const decision = mergeCompatibilityCandidates([
      {
        id: 'legacy-import',
        document: { type: 'doc', content: [] },
        report: {
          items: [],
          counts: { info: 1, warning: 0, error: 0, preservedFragments: 0 },
          hasWarnings: true,
          hasErrors: false,
        },
        timestamp: 10,
      },
      {
        id: 'current-snapshot',
        document: { type: 'doc', content: [] },
        report: {
          items: [],
          counts: { info: 0, warning: 0, error: 0, preservedFragments: 0 },
          hasWarnings: false,
          hasErrors: false,
        },
        timestamp: 5,
      },
    ]);

    expect(decision.selected.candidate.id).toBe('current-snapshot');
    expect(decision.selected.status).toBe('unchanged');
    expect(decision.rejected[0]?.candidate.id).toBe('legacy-import');
  });
});
