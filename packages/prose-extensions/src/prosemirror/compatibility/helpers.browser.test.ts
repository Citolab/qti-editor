import { describe, expect, it, vi } from 'vitest';

import {
  composeHtmlStep,
  htmlApplyDefault,
  htmlPreserveUnknownAttrs,
  htmlRemoveAttr,
  htmlRenameAttr,
} from './helpers.js';
import { createMigrationRegistry } from './index.js';

// ── htmlRenameAttr ────────────────────────────────────────────────────────────

describe('htmlRenameAttr', () => {
  it('renames the attr and emits RENAME_ATTRIBUTE', () => {
    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [htmlRenameAttr('responseIdentifier', 'response-identifier')],
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      '<qti-text-entry-interaction responseIdentifier="RESPONSE"></qti-text-entry-interaction>',
      { source: 'html', fallbackVersion: 1 },
    );

    expect(result.document).toContain('response-identifier="RESPONSE"');
    expect(result.document).not.toContain('responseIdentifier=');
    expect(result.changes.some(c => c.code === 'RENAME_ATTRIBUTE')).toBe(true);
  });

  it('drops the legacy attr when the canonical already exists, with a warning', () => {
    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [htmlRenameAttr('responseIdentifier', 'response-identifier')],
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      '<span responseIdentifier="legacy" response-identifier="canonical"></span>',
      { source: 'html', fallbackVersion: 1 },
    );

    expect(result.document).toContain('response-identifier="canonical"');
    expect(result.document).not.toContain('responseIdentifier=');
    expect(result.changes.some(c => c.code === 'ATTRIBUTE_REMOVED')).toBe(true);
  });
});

// ── htmlApplyDefault ──────────────────────────────────────────────────────────

describe('htmlApplyDefault', () => {
  it('injects the default when the attr is absent', () => {
    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      selector: 'qti-text-entry-interaction',
      transforms: [htmlApplyDefault('case-sensitive', 'false')],
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      '<qti-text-entry-interaction response-identifier="R1"></qti-text-entry-interaction>',
      { source: 'html', fallbackVersion: 1 },
    );

    expect(result.document).toContain('case-sensitive="false"');
    expect(result.changes.some(c => c.code === 'DEFAULT_APPLIED')).toBe(true);
  });

  it('leaves existing values untouched', () => {
    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      selector: 'qti-text-entry-interaction',
      transforms: [htmlApplyDefault('case-sensitive', 'false')],
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      '<qti-text-entry-interaction case-sensitive="true"></qti-text-entry-interaction>',
      { source: 'html', fallbackVersion: 1 },
    );

    expect(result.document).toContain('case-sensitive="true"');
    expect(result.changes.every(c => c.code !== 'DEFAULT_APPLIED')).toBe(true);
  });
});

// ── htmlRemoveAttr ────────────────────────────────────────────────────────────

describe('htmlRemoveAttr', () => {
  it('removes the attr and emits ATTRIBUTE_REMOVED', () => {
    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [htmlRemoveAttr('deprecated')],
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      '<span deprecated="old" keep="yes"></span>',
      { source: 'html', fallbackVersion: 1 },
    );

    expect(result.document).not.toContain('deprecated=');
    expect(result.document).toContain('keep="yes"');
    expect(result.changes.some(c => c.code === 'ATTRIBUTE_REMOVED' && c.attributeName === 'deprecated')).toBe(true);
  });
});

// ── htmlPreserveUnknownAttrs ──────────────────────────────────────────────────

describe('htmlPreserveUnknownAttrs', () => {
  it('moves unknown attrs into the sidecar and removes them from the element', () => {
    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [htmlPreserveUnknownAttrs(['response-identifier', 'score'])],
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      '<span response-identifier="R1" score="2" legacy-field="data"></span>',
      { source: 'html', fallbackVersion: 1 },
    );

    expect(result.document).not.toContain('legacy-field=');
    expect(result.document).toContain('response-identifier="R1"');
    expect(result.preservedFragments).toEqual(
      expect.arrayContaining([expect.objectContaining({ attributeName: 'legacy-field' })]),
    );
    expect(result.changes.some(c => c.code === 'UNKNOWN_ATTRIBUTE_PRESERVED')).toBe(true);
  });
});

// ── composeHtmlStep: selector + getMessage ────────────────────────────────────

describe('composeHtmlStep', () => {
  it('restricts transforms to matching elements via selector', () => {
    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      selector: 'qti-text-entry-interaction',
      transforms: [htmlRenameAttr('old', 'new')],
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      '<div old="should-stay"></div><qti-text-entry-interaction old="should-rename"></qti-text-entry-interaction>',
      { source: 'html', fallbackVersion: 1 },
    );

    expect(result.document).toContain('old="should-stay"');
    expect(result.document).toContain('new="should-rename"');
  });

  it('calls getMessage and uses the returned string as message', () => {
    const getMessage = vi.fn().mockReturnValue('localized rename');

    const step = composeHtmlStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [htmlRenameAttr('old', 'new')],
      getMessage,
    });

    const registry = createMigrationRegistry<string>({ targetVersion: 2, steps: [step] });
    const result = registry.migrate('<span old="v"></span>', { source: 'html', fallbackVersion: 1 });

    const renameChange = result.changes.find(c => c.code === 'RENAME_ATTRIBUTE');
    expect(renameChange?.message).toBe('localized rename');
    expect(getMessage).toHaveBeenCalledWith('RENAME_ATTRIBUTE', expect.objectContaining({ previousAttributeName: 'old' }));
  });
});
