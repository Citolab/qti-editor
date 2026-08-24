/**
 * The wording layer.
 *
 * Worth testing on its own because it is the only part of this feature the user actually reads, and
 * because it has no other way of being wrong: the pipeline's own messages are already correct, and
 * everything here is a judgement about how to say them. The `t` below returns its key plus its
 * interpolations, so each assertion says which phrase was chosen and what was put in it, without
 * pinning the English.
 */
import { describe, expect, test } from 'vitest';

import { groupRecoveryChanges, humanizeTypeName } from './describe.js';

import type { CompatibilityChange } from '@citolab/prose-qti/interfaces';
import type { RecoveryChange } from '@citolab/prose-qti/schema-recovery';

/**
 * A `t` that echoes its key and interpolations, so each assertion says which phrase was chosen and
 * what went into it without pinning the English.
 *
 * `defaultValue` is honoured, because that is how a missing key reports itself: the type-label lookup
 * asks for `compatibilityTypeLabel.<type>` with `defaultValue: ''` and treats empty as "not named".
 * A `t` that echoed the key instead would make every type look named.
 */
const t = (key: string, options?: Record<string, unknown>): string => {
  const { defaultValue, ...rest } = options ?? {};
  if (key.startsWith('compatibilityTypeLabel.')) return String(defaultValue ?? '');
  const parts = Object.entries(rest).map(([name, value]) => `${name}=${String(value)}`);
  return parts.length ? `${key}(${parts.join(',')})` : key;
};

describe('humanizeTypeName', () => {
  test('turns schema names into words and drops the QTI prefix', () => {
    expect(humanizeTypeName('qtiGapMatchInteraction')).toBe('gap match interaction');
    expect(humanizeTypeName('qti-companion-materials-info')).toBe('companion materials info');
    expect(humanizeTypeName('image')).toBe('image');
    // Nothing but the prefix: keep the name rather than saying nothing at all.
    expect(humanizeTypeName('qti')).toBe('qti');
  });
});

describe('groupRecoveryChanges', () => {
  test('sorts removals by what kind of thing went missing', () => {
    const groups = groupRecoveryChanges([
      change({ code: 'UNKNOWN_NODE_PRESERVED', nodeType: 'qtiRetiredInteraction', data: { unwrappedChildren: 2, excerpt: 'Drag each city' } }),
      change({ code: 'UNKNOWN_NODE_PRESERVED', nodeType: 'paragraph', data: { markType: 'highlight', excerpt: 'Amsterdam' } }),
      change({ code: 'UNKNOWN_ATTRIBUTE_PRESERVED', nodeType: 'image', attributeName: 'width', data: { rejectedValue: 320 } }),
    ], t);

    expect(groups.map(group => group.id)).toEqual(['content', 'formatting', 'settings']);
  });

  test('names the content, quotes it, and says what survived', () => {
    const [group] = groupRecoveryChanges([
      change({
        code: 'UNKNOWN_NODE_PRESERVED',
        nodeType: 'qtiRetiredInteraction',
        data: { unwrappedChildren: 2, excerpt: 'Drag each city', siteId: 'recovery-0' },
      }),
    ], t);

    expect(group.items[0]).toMatchObject({
      label: 'compatibilityContentRemoved(name=retired interaction)',
      quote: 'Drag each city',
      aside: 'compatibilityKeptChildren(count=2)',
      technical: 'qtiRetiredInteraction',
      siteId: 'recovery-0',
    });
  });

  test('says so when nothing was left in its place', () => {
    const [group] = groupRecoveryChanges([
      change({ code: 'UNKNOWN_NODE_PRESERVED', nodeType: 'qtiGap', data: { unwrappedChildren: 0 } }),
    ], t);

    expect(group.items[0].aside).toBe('compatibilityKeptNothing');
  });

  test('distinguishes a reset setting from one the format no longer has', () => {
    const [group] = groupRecoveryChanges([
      change({ code: 'UNKNOWN_ATTRIBUTE_PRESERVED', nodeType: 'image', attributeName: 'width', data: { rejectedValue: 320 } }),
      change({ code: 'UNKNOWN_ATTRIBUTE_PRESERVED', nodeType: 'image', attributeName: 'legacyAlign' }),
    ], t);

    expect(group.items[0].label).toBe('compatibilitySettingReset(attribute=width,name=image)');
    expect(group.items[0].aside).toBe('compatibilitySettingRejectedValue(value=320)');
    expect(group.items[1].label).toBe('compatibilitySettingRemoved(attribute=legacyAlign,name=image)');
    expect(group.items[1].aside).toBeUndefined();
  });

  test('dispatches on the declared kind rather than inferring from optional fields', () => {
    // Same code on both, and only `kind` separates them. Inference would have had to look for
    // `data.markType` and `data.rejectedValue` and know what their presence implied.
    const groups = groupRecoveryChanges([
      change({ code: 'UNKNOWN_NODE_PRESERVED', kind: 'dropped-mark', nodeType: 'paragraph', data: { markType: 'highlight' } }),
      change({ code: 'UNKNOWN_NODE_PRESERVED', kind: 'unrepresentable-element', nodeType: 'qti-companion-materials-info', data: { unwrappedChildren: 1 } }),
    ], t);

    expect(groups.map(group => group.id)).toEqual(['content', 'formatting']);
  });

  test('still reads changes written before kind existed', () => {
    // A quarantined document can hold a report older than this code. The old inference stays.
    const groups = groupRecoveryChanges([
      change({ code: 'UNKNOWN_NODE_PRESERVED', nodeType: 'paragraph', data: { markType: 'highlight' } }),
      change({ code: 'UNKNOWN_ATTRIBUTE_PRESERVED', nodeType: 'image', attributeName: 'width', data: { rejectedValue: 320 } }),
    ], t);

    expect(groups.map(group => group.id)).toEqual(['formatting', 'settings']);
    expect(groups[1].items[0].label).toBe('compatibilitySettingReset(attribute=width,name=image)');
  });

  test('a type label from i18n wins over the derived name', () => {
    // The extension point for naming: one resource key, overridable at runtime by an embedder.
    const withLabels: typeof t = (key, options) => (
      key === 'compatibilityTypeLabel.qtiGapMatchInteraction' ? 'gap-match question' : t(key, options)
    );

    const [group] = groupRecoveryChanges([
      change({ code: 'UNKNOWN_NODE_PRESERVED', kind: 'unwrapped-node', nodeType: 'qtiGapMatchInteraction', data: { unwrappedChildren: 1 } }),
    ], withLabels);

    expect(group.items[0].label).toBe('compatibilityContentRemoved(name=gap-match question)');
    // The schema's own name is still in small print for whoever is debugging.
    expect(group.items[0].technical).toBe('qtiGapMatchInteraction');
  });

  test('falls back to the pipeline message for anything it has no phrasing for', () => {
    const [group] = groupRecoveryChanges([
      change({ code: 'UNSUPPORTED_CONTENT_PRESERVED', message: 'Removed an entry that was not a document node.' }),
    ], t);

    expect(group.id).toBe('other');
    expect(group.items[0].label).toBe('Removed an entry that was not a document node.');
  });
});

function change(
  overrides: Partial<RecoveryChange> & Pick<CompatibilityChange, 'code'>,
): CompatibilityChange {
  return { severity: 'warning', message: 'pipeline message', ...overrides } as CompatibilityChange;
}
