import { DOMParser as PMDOMParser, DOMSerializer } from 'prosemirror-model';
import { expect, test } from 'vitest';

import { buildEditorSchema } from './editor-schema';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * The image round trip, end to end through parse and serialise.
 *
 * The schema contract next door states the shape; this states that the shape survives the trip an
 * import/export actually makes. Both halves were broken before: `alt` had no attribute to land in,
 * and `width` was derived from a bounding rect that measures 0 on the detached DOM a parse runs
 * against.
 */
test('an image keeps alt and a percentage width through parse and serialise', () => {
  const schema = buildEditorSchema();

  const dom = document.createElement('div');
  dom.innerHTML = '<p>Kijk: <img src="resources/atom.png" alt="Atoom" width="100%"> hier.</p>';

  const doc = PMDOMParser.fromSchema(schema).parse(dom);

  let img: ProseMirrorNode | null = null;
  doc.descendants(node => {
    if (node.type.name === 'image') img = node;
    return true;
  });

  expect(img, 'the image parsed').not.toBeNull();
  expect(img!.attrs.alt).toBe('Atoom');
  expect(img!.attrs.width).toBe('100%');
  expect(img!.isInline, 'stayed inline rather than being lifted out').toBe(true);

  // And it is still inside the paragraph, between the two text runs.
  expect(doc.firstChild?.type.name).toBe('paragraph');
  expect(doc.firstChild?.textContent).toBe('Kijk:  hier.');

  const out = document.createElement('div');
  out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  const html = out.innerHTML;
  expect(html).toContain('alt="Atoom"');
  expect(html).toContain('width="100%"');
  expect(html).toMatch(/<p>[^<]*<img[^>]*>/);
});
