/**
 * The QTI 3 phrasing elements prosemirror-schema-basic has no mark for survive an import, and the
 * HTML ones QTI does not have are not invented.
 *
 * Without a mark ProseMirror's parser unwraps an element and keeps the text, so the loss was silent:
 * the item opened looking right, and the first save wrote it back without its subscripts,
 * quotations and abbreviations. `<b>` and `<i>` were rewritten as `<strong>` and `<em>`. (`code`
 * already survived the roundtrip schema, which takes prosemirror-schema-basic's marks; the ProseKit
 * base did not have it.)
 *
 * Both schemas are exercised: the roundtrip schema (`createQtiSchema`, the Node conversion's) and the
 * ProseKit one (`defineQtiExtension`, which the editors build on). They share their mark specs, so
 * they must also agree on nesting order — a document moved between them must not reshuffle its marks.
 */
import { clearFormattingInRange } from '@citolab/prose-extensions/clear-formatting';
import { PHRASING_MARK_TAGS } from '@citolab/prose-extensions/html-schema';
import { findUnrepresentableElements } from '@citolab/prose-extensions/schema-gaps';
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
  ['b', '<p>A <b>bold</b> word.</p>'],
  ['i', '<p>A <i>Latin</i> word.</p>'],
  ['small', '<p>The <small>fine print</small>.</p>'],
  ['big', '<p>A <big>big</big> word.</p>'],
  ['tt', '<p>Type <tt>ls</tt>.</p>'],
  ['abbr', '<p>The <abbr>WHO</abbr>.</p>'],
  ['acronym', '<p>The <acronym>NATO</acronym>.</p>'],
  ['cite', '<p>From <cite>Hamlet</cite>.</p>'],
  ['dfn', '<p>A <dfn>noun</dfn> names a thing.</p>'],
  ['kbd', '<p>Press <kbd>Enter</kbd>.</p>'],
  ['samp', '<p>It prints <samp>OK</samp>.</p>'],
  ['var', '<p>Solve for <var>x</var>.</p>'],
  ['q', '<p>She said <q>yes</q>.</p>'],
  ['q, with cite', '<p>She said <q cite="https://example.org/a">yes</q>.</p>'],
  ['code', '<p>Call <code>print()</code>.</p>'],
  ['sub', '<p>H<sub>2</sub>O</p>'],
  ['sup', '<p>10<sup>3</sup> m</p>'],
  ['bdo, with dir and title', '<p>Read <bdo dir="rtl" title="reversed">abc</bdo>.</p>'],
  ['bdi, with dir', '<p>User <bdi dir="rtl">إيان</bdi> wrote.</p>'],
] as const;

describe.each(SCHEMAS)('in %s', (_label, schema) => {
  test.each(MARKS)('%s survives qti3ToPm -> pmToQti3', (_mark, paragraph) => {
    expect(exported(roundtrip(schema, paragraph), 'p')).toBe(html(paragraph));
  });

  test('marks inside a simple choice survive too', () => {
    const body = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-simple-choice identifier="A">CO<sub>2</sub></qti-simple-choice>
      <qti-simple-choice identifier="B"><i>H<sub>2</sub>O</i></qti-simple-choice>
    </qti-choice-interaction>`;
    const xml = roundtrip(schema, body);
    // The choice's text is written inside a <p> on export — existing behaviour, not asserted here.
    expect(exported(xml, 'qti-simple-choice[identifier="A"] sub')).toBe(html('<sub>2</sub>'));
    expect(exported(xml, 'qti-simple-choice[identifier="B"] i')).toBe(html('<i>H<sub>2</sub>O</i>'));
  });

  test('nested marks come back nested the same way, and a second round trip changes nothing', () => {
    // Written in rank order (outermost first), so the export has no reason to reorder them.
    const paragraph =
      '<p><strong><b>a</b></strong> <em><sub>b</sub></em> <code><kbd>c</kbd></code> <i><q><sup>d</sup></q></i></p>';
    expect(exported(roundtrip(schema, paragraph), 'p')).toBe(html(paragraph));

    // Unformatted: `formatXml` puts a line break between `<strong>` and `<b>`, which re-imports as a
    // space inside the outer mark. That happens to `<strong><em>` today too — see
    // docs/testing-findings.md — and is not what this test is about.
    const first = qti3ToPm(item(paragraph), { schema });
    const second = qti3ToPm(exportItemXml(first, schema, undefined, { format: false }), { schema });
    expect(second.eq(first)).toBe(true);
  });

  test('<b> and <i> stay themselves instead of becoming <strong> and <em>', () => {
    const doc = qti3ToPm(item('<p><b>a</b> <i>b</i> <strong>c</strong> <em>d</em></p>'), { schema });
    const marks: string[] = [];
    doc.descendants(node => {
      if (node.isText) marks.push(node.marks.map(mark => mark.type.name).join('+'));
    });
    expect(marks.filter(Boolean)).toEqual(['b', 'i', 'strong', 'em']);
  });

  test("a <b style=\"font-weight: normal\"> (Google Docs' paste wrapper) is not bold", () => {
    const doc = qti3ToPm(item('<p><b style="font-weight: normal">plain</b></p>'), { schema });
    expect(doc.firstChild?.firstChild?.marks).toEqual([]);
  });

  test('u, s and mark are not QTI 3 elements: unwrapped, and the schema-gaps scan reports them', () => {
    const paragraph = '<p><u>u</u> <s>s</s> <mark>m</mark></p>';
    expect(exported(roundtrip(schema, paragraph), 'p')).toBe(html('<p>u s m</p>'));

    const host = document.createElement('div');
    host.innerHTML = paragraph;
    expect(findUnrepresentableElements(schema, host).changes.map(change => change.nodeType)).toEqual([
      'u',
      's',
      'mark',
    ]);
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
  const RANKED: string[] = ['code', ...PHRASING_MARK_TAGS];
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
