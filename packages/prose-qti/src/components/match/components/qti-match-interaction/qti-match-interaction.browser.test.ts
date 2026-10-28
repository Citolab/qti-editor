/**
 * The answer key of a match interaction whose two sets reuse an identifier.
 *
 * Not conformant — QTI wants a choice identifier unique within the item — but nothing enforces it
 * (the XSD types it as an NCName, not an `xs:ID`), and imported tables do reuse identifiers across
 * the sets (rows `1 2 3`, columns `1 2`). The interaction prunes links that name a choice no longer
 * in the document and writes the pruned key back, so if it decides "which side is this identifier
 * on" with one answer per identifier, a shared identifier looks missing from one of the sets and
 * every link naming it is deleted from the item.
 *
 * Only the answer key is pinned. In drag-drop mode one of the two choices is still painted on the
 * wrong side (docs/testing-findings.md, finding 29).
 *
 * Mounted in a live view with the attrs-sync plugin, because that write-back is the damage: the
 * links have to survive in the document, not just in what the interaction paints.
 */
import { nodeAttrsSyncPlugin } from '@citolab/prose-extensions/prosemirror';
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../../integration/interactions/prosekit.js';
import { serializeResponseAttribute } from '../../../shared';

import type { Node as PmNode, Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const mounted: Array<{ view: EditorView; host: HTMLElement }> = [];

afterEach(() => {
  for (const { view, host } of mounted.splice(0)) {
    view.destroy();
    host.remove();
  }
});

const choice = (identifier: string, text: string) =>
  `<qti-simple-associable-choice identifier="${identifier}" match-max="1"><p>${text}</p></qti-simple-associable-choice>`;

/** Rows `1 2 3` and columns `1 2`: identifiers unique per set, shared across them. */
function matchHtml(className: string | null, correctResponse: string): string {
  const cls = className ? ` class="${className}"` : '';
  return `
    <qti-match-interaction${cls} response-identifier="RESPONSE" correct-response="${correctResponse}">
      <qti-simple-match-set>${choice('1', 'Amsterdam')}${choice('2', 'Berlin')}${choice('3', 'Rotterdam')}</qti-simple-match-set>
      <qti-simple-match-set>${choice('1', 'Nederland')}${choice('2', 'Duitsland')}</qti-simple-match-set>
    </qti-match-interaction>`;
}

function mount(html: string): EditorView {
  const source = document.createElement('div');
  source.innerHTML = html;
  const doc = PmDOMParser.fromSchema(schema).parse(source);

  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = new EditorView(host, {
    state: EditorState.create({ doc, schema, plugins: [nodeAttrsSyncPlugin] }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    },
  });
  mounted.push({ view, host });
  return view;
}

/** The answer key in its attribute form; the node holds it parsed on import and as a string once pruned. */
function answerKey(doc: PmNode): string | null {
  return serializeResponseAttribute(interaction(doc).attrs.correctResponse);
}

function interaction(doc: PmNode): PmNode {
  let found: PmNode | null = null;
  doc.descendants(node => {
    if (found) return false;
    if (node.type.name.startsWith('qtiMatchInteraction')) found = node;
    return !found;
  });
  if (!found) throw new Error('no match interaction in the document');
  return found;
}

/** Let Lit render the interaction and its choices, which is when the correction is published. */
async function settle(view: EditorView): Promise<void> {
  const elements = Array.from(
    view.dom.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>(
      'qti-match-interaction, qti-simple-associable-choice',
    ),
  );
  await Promise.all(elements.map(el => el.updateComplete));
  await new Promise(resolve => setTimeout(resolve, 0));
}

const KEY = '1 2,2 1,3 1';

describe('match correction with an identifier shared by a source and a target', () => {
  test.each([
    ['tabular', 'qti-match-tabular'],
    ['drag-drop', null],
  ])('does not prune the answer key in %s mode', async (_mode, className) => {
    const view = mount(matchHtml(className, KEY));
    expect(answerKey(view.state.doc)).toBe(KEY);

    await settle(view);

    expect(answerKey(view.state.doc)).toBe(KEY);
  });

  test('still prunes a link to a choice that is not in its set', async () => {
    // `3` is a source only, so `1 3` names a target that does not exist.
    const view = mount(matchHtml('qti-match-tabular', `${KEY},1 3`));

    await settle(view);

    expect(answerKey(view.state.doc)).toBe(KEY);
  });
});
