/**
 * What this editor's schema cannot represent in the sample corpus.
 *
 * This app's schema is a subset — ten interactions and its own node overrides — and it imports QTI XML
 * straight from a URL into it. `DOMParser` unwraps anything it cannot match and says nothing, so "the
 * item opened" was never evidence the item arrived intact.
 *
 * Two halves, pulling opposite ways: nothing to report on the corpus this editor is built for, and a
 * named finding when an item uses something it does not model. The notice's own rendering and wording
 * are tested with the component, in `packages/prose-qti/src/schema-recovery/notice/`.
 */
import { defaultRoundtripTransforms, itemBodyFromString } from '@citolab/prose-qti/item-roundtrip';
import { findUnrepresentableElements, TRANSPARENT_WRAPPER_TAGS } from '@citolab/prose-qti/schema-recovery';
import { expect, test } from 'vitest';

import { appSchema } from './schema.js';

const SAMPLE_ITEM_IDS = Array.from(
  { length: 16 },
  (_, index) => `ITEM${String(index + 1).padStart(3, '0')}`,
);

const scan = (xml: string) => findUnrepresentableElements(
  appSchema,
  itemBodyFromString(xml, { transforms: [...defaultRoundtripTransforms] }).documentElement,
  { ignoreTags: TRANSPARENT_WRAPPER_TAGS },
);

test.each(SAMPLE_ITEM_IDS)('%s has nothing to report against this schema', async id => {
  const response = await fetch(`/qti/kennisnet/${id}.xml`);
  expect(response.ok).toBe(true);

  expect(scan(await response.text()).changes.map(change => change.nodeType)).toEqual([]);
});

test('an element the schema cannot represent is named, counted and quoted', () => {
  const gaps = scan(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="UNSUPPORTED" title="Unsupported">
  <qti-item-body>
    <qti-companion-materials-info>Ruler and compass</qti-companion-materials-info>
    <qti-companion-materials-info>Calculator</qti-companion-materials-info>
  </qti-item-body>
</qti-assessment-item>`);

  expect(gaps.changes).toHaveLength(2);
  expect(gaps.changes.map(change => change.nodeType)).toEqual([
    'qti-companion-materials-info',
    'qti-companion-materials-info',
  ]);
  expect(gaps.changes[0].kind).toBe('unrepresentable-element');
  expect(gaps.changes[0].data?.excerpt).toBe('Ruler and compass');
  expect(gaps.preservedFragments[0].payload).toContain('Ruler and compass');
});
