import { qtiItemFromProsemirror } from '@citolab/prose-qti/item-export';
import { createQtiSchema } from '@citolab/prose-qti/schema';
import {
  acceptProposal,
  captureAuthoringContext,
  createAuthoringPlugin,
  prepareProposal
} from '@citolab/qti-ai-prosemirror';
// prosemirror-model's DOMParser, renamed to avoid the browser global of the same name.
import { DOMParser as PmParser } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { expect, test } from 'vitest';

import { mountQtiRuntime, stageResponse } from './runtime-harness';

/*
 * Conversational structural edits, scored by the real QTI runtime.
 *
 * The adapter's own tests prove the document is valid after a `convert` or `remove`. This proves
 * the thing the author cares about: the exported item declares the right response and scores a
 * correct answer 1 and a wrong one 0 — for the interaction the item was converted INTO. Export
 * runs through prose-qti's item-export, the same path the editor's save uses.
 */

const schema = createQtiSchema();

const CHOICE =
  '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" correct-response="B" score="1">' +
  '<qti-prompt><p>Which city is the capital of France?</p></qti-prompt>' +
  '<qti-simple-choice identifier="A"><p>Lyon</p></qti-simple-choice>' +
  '<qti-simple-choice identifier="B"><p>Paris</p></qti-simple-choice>' +
  '<qti-simple-choice identifier="C"><p>Marseille</p></qti-simple-choice>' +
  '</qti-choice-interaction>';

function editor(html: string) {
  const host = document.createElement('div');
  document.body.append(host);
  const container = document.createElement('div');
  container.innerHTML = html;
  const doc = PmParser.fromSchema(schema).parse(container);
  const view = new EditorView(host, {
    state: EditorState.create({ schema, doc, plugins: [createAuthoringPlugin()] })
  });
  return { view, close: () => (view.destroy(), host.remove()) };
}

function apply(view: EditorView, operations: (targets: { id: string; nodeType: string }[]) => unknown[]) {
  const context = captureAuthoringContext(view);
  acceptProposal(
    view,
    prepareProposal(view, {
      version: 1,
      requestId: context.requestId,
      capabilityId: context.capabilityId,
      summary: 'structural',
      suggestions: [],
      operations: operations(context.targets)
    })
  );
}

function exportItem(view: EditorView): string {
  return qtiItemFromProsemirror(view.state.doc, { identifier: 'ai-structural', title: 'AI structural' });
}

async function scores(xml: string, correct: unknown, wrong: unknown) {
  const harness = await mountQtiRuntime(xml);
  try {
    stageResponse(harness, correct);
    const right = harness.score();
    stageResponse(harness, wrong);
    const other = harness.score();
    return { right, other };
  } finally {
    harness.destroy();
  }
}

test('choice converted to order: the exported item scores the full permutation, not a wrong order', async () => {
  const { view, close } = editor(CHOICE);
  try {
    apply(view, targets => [
      {
        kind: 'convert',
        target: targets.find(t => t.nodeType === 'qtiChoiceInteraction')!.id,
        to: 'qtiOrderInteraction',
        html:
          '<qti-order-interaction response-identifier="IGNORED" correct-response="C,A,B" shuffle="false">' +
          '<qti-prompt><p>Order the cities from south to north.</p></qti-prompt>' +
          '<qti-simple-choice identifier="A"><p>Lyon</p></qti-simple-choice>' +
          '<qti-simple-choice identifier="B"><p>Paris</p></qti-simple-choice>' +
          '<qti-simple-choice identifier="C"><p>Marseille</p></qti-simple-choice>' +
          '</qti-order-interaction>'
      }
    ]);
    const xml = exportItem(view);
    expect(xml).toContain('<qti-order-interaction');
    expect(xml).not.toContain('<qti-choice-interaction');
    expect(xml).toMatch(/qti-response-declaration[^>]*identifier="RESPONSE"[^>]*cardinality="ordered"/);

    const { right, other } = await scores(xml, ['C', 'A', 'B'], ['A', 'B', 'C']);
    expect(right).toBe(1);
    expect(other).toBe(0);
  } finally {
    close();
  }
});

test('removing the correct distractor of a choice leaves an item that still declares and scores', async () => {
  const { view, close } = editor(
    CHOICE.replace('correct-response="B"', 'max-choices="0" correct-response="B,C"').replace('max-choices="1" ', '')
  );
  try {
    apply(view, targets => [{ kind: 'remove', target: targets.filter(t => t.nodeType === 'qtiSimpleChoice')[2].id }]);
    const xml = exportItem(view);
    expect(xml).not.toContain('Marseille');
    expect(xml).toMatch(/<qti-value>B<\/qti-value>/);
    expect(xml).not.toMatch(/<qti-value>C<\/qti-value>/);

    const { right, other } = await scores(xml, ['B'], ['A']);
    expect(right).toBe(1);
    expect(other).toBe(0);
  } finally {
    close();
  }
});

test('choice converted to text entry inside a paragraph: replace carries the identifier through validation', async () => {
  const { view, close } = editor(CHOICE);
  try {
    // A text entry is inline, so the model replaces the block with a paragraph carrying it. The
    // adapter's response validation still runs over the result, and the identifier is the model's
    // responsibility here — the prompt tells it to keep it.
    apply(view, targets => [
      {
        kind: 'replace',
        target: targets.find(t => t.nodeType === 'qtiChoiceInteraction')!.id,
        html: '<p>The capital of France is <qti-text-entry-interaction response-identifier="RESPONSE" correct-response="Paris" score="1"></qti-text-entry-interaction>.</p>'
      }
    ]);
    const xml = exportItem(view);
    expect(xml).toContain('<qti-text-entry-interaction');
    expect(xml).toMatch(/qti-response-declaration[^>]*identifier="RESPONSE"[^>]*base-type="string"/);

    const { right, other } = await scores(xml, 'Paris', 'Lyon');
    expect(right).toBe(1);
    expect(other).toBe(0);
  } finally {
    close();
  }
});
