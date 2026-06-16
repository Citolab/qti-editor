import { CURRENT_HTML_DOCUMENT_VERSION } from './dom.js';
import { CURRENT_JSON_DOCUMENT_VERSION } from './json.js';
import { HTML_MIGRATION_STEPS, JSON_MIGRATION_STEPS } from './migrations/index.js';

// ── helpers ───────────────────────────────────────────────────────────────────

type Step = { id: string; fromVersion: number; toVersion: number };

function assertChainIntegrity(steps: Step[], label: string) {
  it(`${label}: steps form an unbroken chain starting at v1`, () => {
    expect(steps.length).toBeGreaterThan(0);

    let version = 1;
    for (const step of steps) {
      expect(step.fromVersion).toBe(version);
      version = step.toVersion;
    }
  });

  it(`${label}: each step advances the version by at least one`, () => {
    for (const step of steps) {
      expect(step.toVersion).toBeGreaterThan(step.fromVersion);
    }
  });

  it(`${label}: step IDs are unique`, () => {
    const ids = steps.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
}

// ── JSON migration chain ──────────────────────────────────────────────────────

describe('json migration chain', () => {
  assertChainIntegrity(JSON_MIGRATION_STEPS, 'json');

  it('json: chain reaches the current schema version', () => {
    expect(JSON_MIGRATION_STEPS[JSON_MIGRATION_STEPS.length - 1].toVersion).toBe(
      CURRENT_JSON_DOCUMENT_VERSION,
    );
  });
});

// ── HTML migration chain ──────────────────────────────────────────────────────

describe('html migration chain', () => {
  assertChainIntegrity(HTML_MIGRATION_STEPS, 'html');

  it('html: target version is at least the last defined HTML step (skip-forward covers any gap)', () => {
    expect(CURRENT_HTML_DOCUMENT_VERSION).toBeGreaterThanOrEqual(
      HTML_MIGRATION_STEPS[HTML_MIGRATION_STEPS.length - 1].toVersion,
    );
  });
});
