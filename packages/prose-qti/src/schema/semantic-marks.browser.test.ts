/**
 * `u`, `s`, `mark`, `q`, `code`, `sub`, `sup` and `<span class="qti-underline">` survive an import.
 *
 * Without a mark for them ProseMirror's parser unwraps the element and keeps the text, so the loss
 * was silent: the item opened looking right, and the first save wrote it back without its
 * underlines, struck-through options, subscripts and quotations. (`code` already survived the
 * roundtrip schema, which takes prosemirror-schema-basic's marks; the ProseKit base did not have it.)
 *
 * Both schemas are exercised: the roundtrip schema (`createQtiSchema`, the Node conversion's) and the
 * ProseKit one (`defineQtiExtension`, which the editors build on). They share their mark specs, so
 * they must also agree on nesting order — a document moved between them must not reshuffle its marks.
 */
import { clearFormattingInRange } from '@citolab/prose-extensions/clear-formatting';
import { createEditor } from 'prosekit/core';
import { EditorState } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { exportItemXml } from '../item-roundtrip/export.js';
import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

const SCHEMAS: ReadonlyArray<readonly [string, Schema]> = [
  ['the roundtrip schema', createQtiSchema()],
  ['the ProseKit schema', createEditor({ extension: defineQtiExtension() }).schema],
];

const item = (body: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Marks">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

/**
 * An element as tag, sorted attributes and normalised text — namespaces and indentation aside.
 * Whitespace-only text is dropped because `formatXml` (which `pmToQti3` runs) breaks a line between
 * any two adjacent tags, inline ones included; that is not this mark's doing.
 */
function canonical(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text.trim() === '' ? '' : text.replace(/\s+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const attrs = Array.from(el.attributes)
    .filter(a => a.name !== 'xmlns' && !a.name.startsWith('xmlns:'))
    .map(a => ` ${a.name}="${a.value}"`)
    .sort()
    .join('');
  const kids = Array.from(el.childNodes).map(canonical).join('');
  return `<${el.localName}${attrs}>${kids}</${el.localName}>`;
}

/** The first `selector` in the exported item's body, canonicalised. */
function exported(xml: string, selector: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const found = doc.querySelector(`qti-item-body ${selector}`);
  if (!found) throw new Error(`no ${selector} in the export:\n${xml}`);
  return canonical(found);
}

const html = (markup: string): string => {
  const holder = new DOMParser().parseFromString(`<x>${markup}</x>`, 'application/xml');
  return canonical(holder.documentElement.firstElementChild!);
};

const roundtrip = (schema: Schema, body: string): string => pmToQti3(qti3ToPm(item(body), { schema }), { schema });

const MARKS = [
  ['u', '<p>Read the <u>underlined</u> word.</p>'],
  ['s', '<p>Not <s>this</s> but that.</p>'],
  ['mark', '<p>The <mark>highlighted</mark> part.</p>'],
  ['q', '<p>She said <q>yes</q>.</p>'],
  ['code', '<p>Call <code>print()</code>.</p>'],
  ['sub', '<p>H<sub>2</sub>O</p>'],
  ['sup', '<p>10<sup>3</sup> m</p>'],
  ['qtiUnderline', '<p>Read the <span class="qti-underline">underlined</span> word.</p>'],
  [
    'qtiUnderline, with a second class',
    '<p>Read the <span class="qti-underline extra">underlined</span> word.</p>',
  ],
] as const;

describe.each(SCHEMAS)('in %s', (_label, schema) => {
  test.each(MARKS)('%s survives qti3ToPm -> pmToQti3', (_mark, paragraph) => {
    expect(exported(roundtrip(schema, paragraph), 'p')).toBe(html(paragraph));
  });

  test('marks inside a simple choice survive too', () => {
    const body = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-simple-choice identifier="A">CO<sub>2</sub></qti-simple-choice>
      <qti-simple-choice identifier="B"><s>H<sub>2</sub>O</s></qti-simple-choice>
    </qti-choice-interaction>`;
    const xml = roundtrip(schema, body);
    // The choice's text is written inside a <p> on export — existing behaviour, not asserted here.
    expect(exported(xml, 'qti-simple-choice[identifier="A"] sub')).toBe(html('<sub>2</sub>'));
    expect(exported(xml, 'qti-simple-choice[identifier="B"] s')).toBe(html('<s>H<sub>2</sub>O</s>'));
  });

  test('nested marks come back nested the same way, and a second round trip changes nothing', () => {
    // Written in rank order (outermost first), so the export has no reason to reorder them.
    const paragraph =
      '<p><strong><u>a</u></strong> <em><sub>b</sub></em> <code><mark>c</mark></code> <s><q><sup>d</sup></q></s></p>';
    expect(exported(roundtrip(schema, paragraph), 'p')).toBe(html(paragraph));

    // Unformatted: `formatXml` puts a line break between `<strong>` and `<u>`, which re-imports as a
    // space inside the outer mark. That happens to `<strong><em>` today too — see
    // docs/testing-findings.md — and is not what this test is about.
    const first = qti3ToPm(item(paragraph), { schema });
    const second = qti3ToPm(exportItemXml(first, schema, undefined, { format: false }), { schema });
    expect(second.eq(first)).toBe(true);
  });

  test('clear formatting strips them', () => {
    const doc = qti3ToPm(item(MARKS.map(([, p]) => p).join('')), { schema });
    const state = EditorState.create({ doc });
    const tr = state.tr;
    clearFormattingInRange(tr, { from: 0, to: doc.content.size });
    let marked = 0;
    tr.doc.descendants(node => {
      marked += node.marks.length;
    });
    expect(marked).toBe(0);
  });
});

test('both schemas rank these marks the same, and after em / strong', () => {
  const RANKED = ['code', 'u', 's', 'mark', 'q', 'sub', 'sup', 'qtiUnderline'];
  for (const [label, schema] of SCHEMAS) {
    const names = Object.keys(schema.marks);
    expect(names.filter(name => RANKED.includes(name)), label).toEqual(RANKED);
    // em / strong outside every one of them. (Their order relative to each other differs between
    // the two schemas, and did before these marks existed — see docs/testing-findings.md.)
    for (const outer of ['em', 'strong']) {
      expect(names.indexOf(outer), `${label}: ${outer}`).toBeLessThan(names.indexOf('code'));
    }
  }
});
