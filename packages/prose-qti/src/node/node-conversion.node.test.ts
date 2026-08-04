/* eslint-disable import/no-nodejs-modules -- a *.node.test.ts runs in Node by definition; the rule
   guards the browser-targeted source, which this is not. */
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { createQtiSchema, htmlToPm, pmToHtml, pmToQti3, validateHtml, qti3ToPm } from '@citolab/prose-qti/node';

/**
 * The Node conversion surface, exercised the way a consumer uses it.
 *
 * Runs in the `node` Vitest project — no browser, no `happy-dom`, no test-side shim. Importing
 * `./index.js` installs the DOM, which is the whole point: if that import did not work, none of
 * these would run.
 *
 * Every other test in this repo runs in Chromium, where a real DOM exists and would mask the
 * failure this file is here to catch.
 *
 * Imports the BUILT package rather than relative source, deliberately: that is the artifact a
 * consumer installs, bundle and all. Testing source here would pass while the shipped thing failed,
 * which is precisely what happened before the bundle existed — Node rejects the extensionless
 * relative imports in the `@qti-components` dists, and only the build step resolves them.
 *
 * `apps/e2e/verify-node-conversion.mjs` runs the same surface under plain `node`, with no test
 * runner in the way at all.
 */

const FIXTURES = new URL('../../../../apps/e2e/stories/fixtures/', import.meta.url);
const SNAPSHOTS = new URL('../../../../apps/e2e/stories/__file_snapshots__/', import.meta.url);
// Read from disk rather than counting to a literal. The count WAS a literal 17, and removing
// ITEM017 with the associate interaction turned it into a test that asked for a file nobody had
// deleted it from — a failure about the corpus size rather than about conversion.
const ITEMS = readdirSync(FIXTURES)
  .filter(name => /^ITEM\d+\.xml$/.test(name))
  .map(name => name.replace(/\.xml$/, ''))
  .sort();

const read = (base: URL, name: string) => readFileSync(new URL(name, base), 'utf8');

/**
 * Compare XML by structure rather than bytes.
 *
 * linkedom orders attributes differently from the browser's XMLSerializer, emits an XML
 * declaration, and drops the `xmlns:xsi` declaration while keeping `xsi:schemaLocation`. All three
 * are serializer behaviour, not conversion differences — so they are normalised away here and
 * asserted separately below, rather than being allowed to fail the roundtrip.
 */
function canonical(xml: string): string {
  const doc = new DOMParser().parseFromString(xml.replace(/^<\?xml[^?]*\?>\s*/, ''), 'text/xml');
  const walk = (node: Node): string => {
    if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (node.nodeType !== 1) return '';
    const el = node as Element;
    const attrs = Array.from(el.attributes)
      .filter(a => a.name !== 'xmlns:xsi')
      .map(a => `${a.name}=${JSON.stringify(a.value)}`)
      .sort()
      .join(' ');
    const kids = Array.from(el.childNodes).map(walk).filter(Boolean).join('');
    return `<${el.localName}${attrs ? ` ${attrs}` : ''}>${kids}</${el.localName}>`;
  };
  return doc.documentElement ? walk(doc.documentElement) : '';
}

describe('the DOM is available without a browser', () => {
  test('importing the subpath installs what the conversion needs', () => {
    expect(typeof globalThis.document).toBe('object');
    expect(typeof globalThis.DOMParser).toBe('function');
    expect(typeof globalThis.XMLSerializer).toBe('function');
    expect(typeof globalThis.HTMLElement).toBe('function');
    // The one that is easy to get wrong: it must accept a root element name.
    expect(typeof document.implementation.createDocument).toBe('function');
    const made = document.implementation.createDocument('urn:x', 'qti-item-body', null);
    expect(made.documentElement?.localName).toBe('qti-item-body');
  });
});

describe('createQtiSchema', () => {
  test('includes the layout wrappers, without which author layout is dropped', () => {
    expect(Object.keys(createQtiSchema().nodes)).toContain('qtiLayoutDiv');
  });

  test('can be narrowed to a single interaction', () => {
    const narrow = createQtiSchema({ include: ['qti-order-interaction'] });
    expect(Object.keys(narrow.nodes)).toContain('qtiOrderInteraction');
    expect(Object.keys(narrow.nodes)).not.toContain('qtiChoiceInteraction');
  });
});

describe('qti3ToPm -> pmToQti3 reproduces the committed snapshots', () => {
  // One test per item so a failure names the item rather than a count.
  for (const item of ITEMS) {
    test(item, () => {
      const doc = qti3ToPm(read(FIXTURES, `${item}.xml`), { assetBasePath: '/qti/kennisnet' });
      expect(canonical(pmToQti3(doc))).toBe(canonical(read(SNAPSHOTS, `${item}-editor.xml`)));
    });
  }
});

describe('the HTML boundary', () => {
  test('pmToHtml and htmlToPm are inverses for simple prose', () => {
    const doc = htmlToPm('<p>Water boils at 100 degrees.</p>', { identifier: 'X', title: 'X' });
    expect(pmToHtml(doc)).toBe('<p>Water boils at 100 degrees.</p>');
  });

  test('htmlToPm coerces rather than throwing — which is why validateHtml exists', () => {
    // A table is not legal inside a prompt. The parser does not complain; it quietly rewrites.
    expect(() =>
      htmlToPm('<qti-prompt><table><tbody><tr><td>x</td></tr></tbody></table></qti-prompt>', {
        identifier: 'X',
        title: 'X'
      })
    ).not.toThrow();
  });
});

describe('validateHtml', () => {
  const options = { identifier: 'X', title: 'X' };

  test.each([
    ['a paragraph', '<p>Water boils at 100 degrees.</p>'],
    ['a list', '<ul><li><p>one</p></li><li><p>two</p></li></ul>'],
    ['layout wrappers', '<div class="qti-layout-row"><div class="qti-layout-col6"><p>left</p></div></div>']
  ])('accepts %s', (_label, html) => {
    expect(validateHtml(html, options).valid).toBe(true);
  });

  test('rejects a table inside a prompt, and says what changed', () => {
    const result = validateHtml(
      '<qti-prompt><table><tbody><tr><td>nope</td></tr></tbody></table></qti-prompt>',
      options
    );

    expect(result.valid).toBe(false);

    /*
     * The report a generator acts on: the prompt is what it got wrong. Only added/removed are
     * reported — a moved element is matched and stays quiet, because listing table, tbody, tr and
     * td as "moved" for one lifting is noise, not signal.
     */
    expect(result.changes.map(c => `${c.kind} ${c.tag}`)).toEqual(
      expect.arrayContaining(['removed qti-prompt'])
    );
    expect(result.changes.every(c => c.kind === 'added' || c.kind === 'removed')).toBe(true);

    /*
     * The prompt is what goes, not the table — the schema LIFTS content it cannot nest rather than
     * discarding it. Worth pinning: it means a generator's words survive a structural mistake, so
     * the corrected form is usable as-is instead of silently losing what the author wrote.
     */
    expect(result.normalizedHtml).not.toContain('<qti-prompt');
    expect(result.normalizedHtml).toContain('nope');
  });

  test('reports the schema-normalised HTML even when the input was fine', () => {
    const result = validateHtml('<p>fine</p>', options);
    expect(result.valid).toBe(true);
    expect(result.normalizedHtml).toBe('<p>fine</p>');
  });
});
