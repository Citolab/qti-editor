/**
 * The plain-ProseMirror half of the global attributes: `withGlobalAttrs` / `withGlobalAttrsOn` on
 * prosemirror-schema-basic's specs, the `span` mark, and the unique-ids plugin in a plain
 * `EditorView`. The ProseKit half is `prosekit/global-attrs.browser.test.ts`; prose-qti runs both
 * schemas through a whole item.
 */
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model';
import { marks as basicMarks, nodes as basicNodes } from 'prosemirror-schema-basic';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { findUnrepresentableElements } from '../schema-gaps/index.js';
import { createUniqueIdsPlugin, spanMarkSpec, withGlobalAttrs, withGlobalAttrsOn, XML_NS } from './index.js';

const schema = new Schema({
  nodes: withGlobalAttrsOn({ ...basicNodes }),
  marks: withGlobalAttrsOn({ link: basicMarks.link, span: spanMarkSpec, em: basicMarks.em, strong: basicMarks.strong }),
});

function roundtrip(html: string): string {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const out = document.createElement('div');
  out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(DOMParser.fromSchema(schema).parse(holder).content));
  return out.innerHTML;
}

describe('withGlobalAttrs', () => {
  test.each([
    ['a paragraph', '<p class="c" id="p" lang="en">x</p>'],
    ['a heading, keeping its level', '<h3 class="c" xml:lang="de">x</h3>'],
    ['a blockquote', '<blockquote id="q"><p>x</p></blockquote>'],
    ['an image', '<p><img src="a.png" class="qti-margin-3"></p>'],
    ['a hard break', '<p>a<br id="b">b</p>'],
    ['a link', '<p><a href="u" class="l">x</a></p>'],
  ])('keeps them on %s', (_name, html) => {
    expect(roundtrip(html)).toBe(html);
  });

  test('reads xml:lang in the XML namespace as well as the literal attribute', () => {
    const p = document.createElementNS('http://www.w3.org/1999/xhtml', 'p');
    p.setAttributeNS(XML_NS, 'xml:lang', 'fr');
    p.textContent = 'x';
    const holder = document.createElement('div');
    holder.appendChild(p);
    expect(DOMParser.fromSchema(schema).parse(holder).firstChild?.attrs.xmlLang).toBe('fr');
  });

  test('writes xml:lang in the XML namespace', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', { xmlLang: 'fr' }, [schema.text('x')])]);
    const p = DOMSerializer.fromSchema(schema).serializeNode(doc.firstChild!) as Element;
    expect(p.getAttributeNS(XML_NS, 'lang')).toBe('fr');
    expect(p.hasAttribute('lang')).toBe(false);
  });

  test('leaves a spec without them byte-for-byte, and a second call changes nothing', () => {
    expect(roundtrip('<p>a <em>b</em></p><hr>')).toBe('<p>a <em>b</em></p><hr>');
    const once = withGlobalAttrs(basicNodes.paragraph);
    expect(withGlobalAttrs(once)).toBe(once);
  });
});

describe('the span mark', () => {
  test('matches a span with any of the four, and not a bare one', () => {
    expect(roundtrip('<p><span class="a">x</span><span id="i">y</span><span lang="fr">z</span><span>w</span></p>')).toBe(
      '<p><span class="a">x</span><span id="i">y</span><span lang="fr">z</span>w</p>',
    );
  });

  test('a bare span is still reported by the schema-gaps scan', () => {
    const host = document.createElement('div');
    host.innerHTML = '<p><span class="a">x</span> <span>y</span></p>';
    expect(findUnrepresentableElements(schema, host).changes.map(change => change.path)).toEqual(['div > p[0] > span[1]']);
  });
});

describe('unique ids in a plain EditorView', () => {
  test('Enter in the middle of a paragraph clears the id on the second half', async () => {
    const holder = document.createElement('div');
    holder.innerHTML = '<p id="p1">ab</p>';
    const doc = DOMParser.fromSchema(schema).parse(holder);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = new EditorView(host, {
      state: EditorState.create({
        doc,
        selection: TextSelection.create(doc, 2),
        plugins: [createUniqueIdsPlugin(), keymap(baseKeymap)],
      }),
    });
    try {
      view.focus();
      await userEvent.keyboard('{Enter}');
      const ids: unknown[] = [];
      view.state.doc.forEach(node => ids.push(node.attrs.id));
      expect(ids).toEqual(['p1', null]);
    } finally {
      view.destroy();
      host.remove();
    }
  });
});
