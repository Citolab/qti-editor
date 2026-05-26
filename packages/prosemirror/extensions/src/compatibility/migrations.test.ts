import { CURRENT_HTML_DOCUMENT_VERSION } from './dom.js';
import { CURRENT_JSON_DOCUMENT_VERSION } from './json.js';
import { HTML_MIGRATION_STEPS, JSON_MIGRATION_STEPS } from './migrations.js';

// ── helpers ───────────────────────────────────────────────────────────────────

type Step = { id: string; fromVersion: number; toVersion: number };

function assertChainIntegrity(steps: Step[], currentVersion: number, label: string) {
  it(`${label}: steps form an unbroken chain from v1 to v${currentVersion}`, () => {
    expect(steps.length).toBeGreaterThan(0);

    let version = 1;
    for (const step of steps) {
      expect(step.fromVersion).toBe(version);
      version = step.toVersion;
    }

    expect(version).toBe(currentVersion);
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

  it(`${label}: CURRENT_*_DOCUMENT_VERSION matches last step toVersion`, () => {
    expect(steps[steps.length - 1].toVersion).toBe(currentVersion);
  });
}

// ── JSON migration chain ──────────────────────────────────────────────────────

describe('json migration chain', () => {
  assertChainIntegrity(JSON_MIGRATION_STEPS, CURRENT_JSON_DOCUMENT_VERSION, 'json');
});

// ── HTML migration chain ──────────────────────────────────────────────────────

describe('html migration chain', () => {
  assertChainIntegrity(HTML_MIGRATION_STEPS, CURRENT_HTML_DOCUMENT_VERSION, 'html');
});
