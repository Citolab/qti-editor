import { createMigrationRegistry } from './index.js';

// Simple document shape that makes step effects readable in assertions.
type Doc = { value: string; schemaVersion?: number };

const makeStep = (from: number, to: number, suffix: string) => ({
  id: `v${from}-to-v${to}`,
  fromVersion: from,
  toVersion: to,
  description: `append "${suffix}"`,
  migrate: (doc: Doc) => ({ ...doc, value: doc.value + suffix }),
});

// ── migration ordering ────────────────────────────────────────────────────────

describe('migration ordering', () => {
  it('sorts out-of-order step declarations by fromVersion', () => {
    const registry = createMigrationRegistry<Doc>({
      targetVersion: 3,
      steps: [makeStep(2, 3, '-C'), makeStep(1, 2, '-B')],
    });

    const result = registry.migrate({ value: 'A' }, { source: 'test', fallbackVersion: 1 });

    expect(result.document.value).toBe('A-B-C');
    expect(result.appliedStepIds).toEqual(['v1-to-v2', 'v2-to-v3']);
  });

  it('applies a multi-step chain sequentially from the detected source version', () => {
    const registry = createMigrationRegistry<Doc>({
      targetVersion: 4,
      steps: [makeStep(1, 2, '-b'), makeStep(2, 3, '-c'), makeStep(3, 4, '-d')],
    });

    const result = registry.migrate({ value: 'a' }, { source: 'test', fallbackVersion: 1 });

    expect(result.document.value).toBe('a-b-c-d');
    expect(result.appliedStepIds).toHaveLength(3);
  });

  it('starts from a mid-chain version when sourceVersion is above 1', () => {
    const registry = createMigrationRegistry<Doc>({
      targetVersion: 4,
      steps: [makeStep(1, 2, '-b'), makeStep(2, 3, '-c'), makeStep(3, 4, '-d')],
    });

    const result = registry.migrate({ value: 'start' }, { source: 'test', sourceVersion: 2 });

    expect(result.document.value).toBe('start-c-d');
    expect(result.appliedStepIds).toEqual(['v2-to-v3', 'v3-to-v4']);
  });

  it('skips forward to the target version when no further step bridges the gap', () => {
    const registry = createMigrationRegistry<Doc>({
      targetVersion: 3,
      steps: [makeStep(1, 2, '-b')], // no v2→v3
    });

    const result = registry.migrate({ value: 'x' }, { source: 'test', fallbackVersion: 1 });

    // v1→v2 runs, then there is no v2→v3 step so the engine jumps to the target.
    expect(result.document.value).toBe('x-b');
    expect(result.appliedStepIds).toEqual(['v1-to-v2']);
    expect(result.targetVersion).toBe(3);
  });

  it('skips forward to the next registered step when an intermediate version has no step', () => {
    const registry = createMigrationRegistry<Doc>({
      targetVersion: 4,
      steps: [makeStep(1, 2, '-b'), makeStep(3, 4, '-d')], // no v2→v3
    });

    const result = registry.migrate({ value: 'x' }, { source: 'test', fallbackVersion: 1 });

    expect(result.document.value).toBe('x-b-d');
    expect(result.appliedStepIds).toEqual(['v1-to-v2', 'v3-to-v4']);
    expect(result.changes.some(c => c.code === 'VERSION_DETECTED' && c.data?.detection === 'skip-forward')).toBe(true);
  });

  it('returns the document unchanged (by reference) when already at target version', () => {
    const registry = createMigrationRegistry<Doc>({
      targetVersion: 2,
      steps: [makeStep(1, 2, '-changed')],
    });

    const doc = { value: 'current' };
    const result = registry.migrate(doc, { source: 'test', sourceVersion: 2 });

    expect(result.document).toBe(doc);
    expect(result.appliedStepIds).toHaveLength(0);
    expect(result.changes.some(c => c.code === 'STEP_APPLIED')).toBe(false);
  });

  it('emits STEP_APPLIED for each step that runs', () => {
    const registry = createMigrationRegistry<Doc>({
      targetVersion: 3,
      steps: [makeStep(1, 2, '-b'), makeStep(2, 3, '-c')],
    });

    const result = registry.migrate({ value: 'a' }, { source: 'test', fallbackVersion: 1 });

    const stepChanges = result.changes.filter(c => c.code === 'STEP_APPLIED');
    expect(stepChanges).toHaveLength(2);
    expect(stepChanges[0]?.data?.stepId).toBe('v1-to-v2');
    expect(stepChanges[1]?.data?.stepId).toBe('v2-to-v3');
  });
});

// ── version detection ─────────────────────────────────────────────────────────

describe('version detection', () => {
  const registry = createMigrationRegistry<Doc>({
    targetVersion: 2,
    detectVersion: (doc) => (typeof doc.schemaVersion === 'number' ? doc.schemaVersion : null),
    steps: [makeStep(1, 2, '-migrated')],
  });

  it('uses explicit sourceVersion over document-level detection', () => {
    // doc carries schemaVersion 99 which would cause a throw if used,
    // but sourceVersion: 2 means "already current" and wins.
    const result = registry.migrate({ value: 'x', schemaVersion: 99 }, { source: 'test', sourceVersion: 2 });

    expect(result.document.value).toBe('x');
    expect(result.appliedStepIds).toHaveLength(0);
    const versionChange = result.changes.find(c => c.code === 'VERSION_DETECTED');
    expect(versionChange?.data?.detection).toBe('explicit');
  });

  it('detects version from the document when no explicit sourceVersion is given', () => {
    const result = registry.migrate({ value: 'x', schemaVersion: 1 }, { source: 'test' });

    expect(result.document.value).toBe('x-migrated');
    const versionChange = result.changes.find(c => c.code === 'VERSION_DETECTED');
    expect(versionChange?.data?.detection).toBe('detected');
  });

  it('emits VERSION_ASSUMED warning and uses fallbackVersion when version is unknowable', () => {
    const result = registry.migrate({ value: 'x' }, { source: 'test', fallbackVersion: 1 });

    expect(result.document.value).toBe('x-migrated');
    const assumed = result.changes.find(c => c.code === 'VERSION_ASSUMED');
    expect(assumed).toBeDefined();
    expect(assumed?.severity).toBe('warning');
  });

  it('does not emit VERSION_ASSUMED when sourceVersion is explicit', () => {
    const result = registry.migrate({ value: 'x' }, { source: 'test', sourceVersion: 1 });

    expect(result.changes.some(c => c.code === 'VERSION_ASSUMED')).toBe(false);
    expect(result.changes.some(c => c.code === 'VERSION_DETECTED')).toBe(true);
  });

  it('records sourceVersion and targetVersion on the result', () => {
    const result = registry.migrate({ value: 'x' }, { source: 'test', sourceVersion: 1 });

    expect(result.sourceVersion).toBe(1);
    expect(result.targetVersion).toBe(2);
  });
});
