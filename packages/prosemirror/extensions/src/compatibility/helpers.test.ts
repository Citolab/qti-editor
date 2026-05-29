import {
  composeJsonStep,
  jsonApplyDefault,
  jsonPreserveUnknownAttrs,
  jsonRemoveAttr,
  jsonRenameAttr,
} from './helpers.js';
import { createMigrationRegistry } from './index.js';

import type { NodeJSON } from 'prosekit/core';

// ── fixtures ──────────────────────────────────────────────────────────────────

const makeDoc = (attrs: Record<string, unknown>): NodeJSON => ({
  type: 'doc',
  content: [
    {
      type: 'qtiTextEntryInteraction',
      attrs,
    },
  ],
});

// ── jsonRenameAttr ────────────────────────────────────────────────────────────

describe('jsonRenameAttr', () => {
  it('renames the attr and emits RENAME_ATTRIBUTE', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonRenameAttr('old-name', 'newName')],
    });

    const doc = makeDoc({ 'old-name': 'value', score: 1 });
    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(doc, { source: 'json', fallbackVersion: 1 });

    expect(result.document.content?.[0]?.attrs).toEqual({ newName: 'value', score: 1 });
    expect(result.changes.some(c => c.code === 'RENAME_ATTRIBUTE' && c.attributeName === 'newName')).toBe(true);
  });

  it('drops the legacy attr when the canonical already exists, with a warning', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonRenameAttr('old-name', 'newName')],
    });

    const doc = makeDoc({ 'old-name': 'legacy', newName: 'canonical' });
    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(doc, { source: 'json', fallbackVersion: 1 });

    expect(result.document.content?.[0]?.attrs).toEqual({ newName: 'canonical' });
    expect(result.changes.some(c => c.code === 'ATTRIBUTE_REMOVED' && c.attributeName === 'old-name')).toBe(true);
  });

  it('is a no-op on nodes that do not have the attr', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonRenameAttr('absent', 'newName')],
    });

    const originalDoc = makeDoc({ score: 1 });
    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(originalDoc, { source: 'json', fallbackVersion: 1 });

    expect(result.document.content?.[0]?.attrs).toEqual({ score: 1 });
    expect(result.changes.every(c => c.code !== 'RENAME_ATTRIBUTE')).toBe(true);
  });

  it('walks nested content', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonRenameAttr('old', 'new')],
    });

    const doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'outer',
          attrs: { other: 1 },
          content: [
            { type: 'inner', attrs: { old: 'val' } },
          ],
        },
      ],
    };

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(doc, { source: 'json', fallbackVersion: 1 });

    const inner = (result.document.content?.[0] as NodeJSON & { content?: NodeJSON[] })?.content?.[0];
    expect(inner?.attrs).toEqual({ new: 'val' });
  });
});

// ── jsonApplyDefault ──────────────────────────────────────────────────────────

describe('jsonApplyDefault', () => {
  it('injects the default when the attr is absent', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonApplyDefault('caseSensitive', false)],
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(makeDoc({ score: 2 }), { source: 'json', fallbackVersion: 1 });

    expect(result.document.content?.[0]?.attrs).toEqual({ score: 2, caseSensitive: false });
    expect(result.changes.some(c => c.code === 'DEFAULT_APPLIED')).toBe(true);
  });

  it('leaves existing values untouched', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonApplyDefault('caseSensitive', false)],
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(makeDoc({ caseSensitive: true }), { source: 'json', fallbackVersion: 1 });

    expect(result.document.content?.[0]?.attrs?.caseSensitive).toBe(true);
    expect(result.changes.every(c => c.code !== 'DEFAULT_APPLIED')).toBe(true);
  });
});

// ── jsonRemoveAttr ────────────────────────────────────────────────────────────

describe('jsonRemoveAttr', () => {
  it('removes the attr and emits ATTRIBUTE_REMOVED', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonRemoveAttr('deprecated')],
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(makeDoc({ deprecated: 'x', keep: 1 }), { source: 'json', fallbackVersion: 1 });

    expect(result.document.content?.[0]?.attrs).toEqual({ keep: 1 });
    expect(result.changes.some(c => c.code === 'ATTRIBUTE_REMOVED' && c.attributeName === 'deprecated')).toBe(true);
  });
});

// ── jsonPreserveUnknownAttrs ──────────────────────────────────────────────────

describe('jsonPreserveUnknownAttrs', () => {
  it('moves unknown attrs to the sidecar and removes them from the node', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonPreserveUnknownAttrs(['responseIdentifier', 'score'])],
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(
      makeDoc({ responseIdentifier: 'R1', score: 2, unknownLegacy: 'data' }),
      { source: 'json', fallbackVersion: 1 },
    );

    expect(result.document.content?.[0]?.attrs).toEqual({ responseIdentifier: 'R1', score: 2 });
    expect(result.preservedFragments).toEqual(
      expect.arrayContaining([expect.objectContaining({ attributeName: 'unknownLegacy' })]),
    );
    expect(result.changes.some(c => c.code === 'UNKNOWN_ATTRIBUTE_PRESERVED')).toBe(true);
  });

  it('is a no-op when all attrs are known', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonPreserveUnknownAttrs(['responseIdentifier'])],
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(makeDoc({ responseIdentifier: 'R1' }), { source: 'json', fallbackVersion: 1 });

    expect(result.preservedFragments).toHaveLength(0);
    expect(result.changes.every(c => c.code !== 'UNKNOWN_ATTRIBUTE_PRESERVED')).toBe(true);
  });
});

// ── composeJsonStep: multiple transforms ──────────────────────────────────────

describe('composeJsonStep', () => {
  it('applies multiple transforms left-to-right on the same node', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [
        jsonRenameAttr('old', 'new'),
        jsonApplyDefault('extra', 0),
      ],
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(makeDoc({ old: 'v' }), { source: 'json', fallbackVersion: 1 });

    expect(result.document.content?.[0]?.attrs).toEqual({ new: 'v', extra: 0 });
  });

  it('calls getMessage and uses the returned string as message', () => {
    const getMessage = vi.fn().mockReturnValue('translated message');

    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonRenameAttr('old', 'new')],
      getMessage,
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(makeDoc({ old: 'v' }), { source: 'json', fallbackVersion: 1 });

    const renameChange = result.changes.find(c => c.code === 'RENAME_ATTRIBUTE');
    expect(renameChange?.message).toBe('translated message');
    expect(getMessage).toHaveBeenCalledWith('RENAME_ATTRIBUTE', expect.objectContaining({ previousAttributeName: 'old' }));
  });

  it('falls back to built-in message when getMessage returns null', () => {
    const step = composeJsonStep({
      id: 'test',
      fromVersion: 1,
      toVersion: 2,
      transforms: [jsonRenameAttr('old', 'new')],
      getMessage: () => null,
    });

    const registry = createMigrationRegistry({ targetVersion: 2, steps: [step] });
    const result = registry.migrate(makeDoc({ old: 'v' }), { source: 'json', fallbackVersion: 1 });

    const renameChange = result.changes.find(c => c.code === 'RENAME_ATTRIBUTE');
    expect(renameChange?.message).toContain('Renamed attribute');
  });
});
