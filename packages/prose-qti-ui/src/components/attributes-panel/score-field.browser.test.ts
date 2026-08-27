/**
 * `score` must be authorable on every interaction that declares it.
 *
 * It used to be reachable on none of them from the app. Node types with a
 * friendly editor never render the generic field list at all — the editor
 * replaces it — so extended-text's `score` entry in `editableAttributes` was
 * inert. Node types without one rendered it, but disabled, inside the collapsed
 * read-only details.
 *
 * The panel now renders the field itself for any node carrying the attribute,
 * on both paths. These tests pin both paths and the absence of a leftover copy
 * in the read-only bucket.
 */
import { describe, expect, test, afterEach } from 'vitest';

import './index.js';

import type { QtiAttributesPanel } from './attributes-panel.js';
import type { AttributesNodeDetail } from './attributes-helpers.js';

let mounted: QtiAttributesPanel[] = [];

afterEach(() => {
  mounted.forEach(panel => panel.remove());
  mounted = [];
});

/**
 * `nodes` is private state fed from the editor, so it is set directly rather
 * than driving a real selection — these tests are about how a node's attributes
 * are PRESENTED, and building a document to reach one interaction would
 * exercise ProseMirror instead.
 */
async function mountPanel(type: string, attrs: Record<string, unknown>) {
  const panel = document.createElement('qti-attributes-panel') as QtiAttributesPanel;
  document.body.appendChild(panel);
  mounted.push(panel);

  const node: AttributesNodeDetail = { type, pos: 0, attrs: attrs as AttributesNodeDetail['attrs'] };
  (panel as unknown as { nodes: AttributesNodeDetail[] }).nodes = [node];
  await panel.updateComplete;

  const labelled = (text: string) =>
    Array.from(panel.querySelectorAll('label')).filter(
      label => label.querySelector('span')?.textContent?.trim() === text,
    );

  return {
    panel,
    scoreLabels: () => labelled('Score'),
    scoreInput: () => labelled('Score')[0]?.querySelector('input') as HTMLInputElement | undefined,
    // The generic field list labels with the raw attribute key, so a leftover
    // copy would show up as lowercase `score`.
    genericScoreLabels: () => labelled('score'),
  };
}

const CHOICE_ATTRS = {
  maxChoices: 1,
  class: null,
  correctResponse: 'choice1',
  responseIdentifier: 'RESPONSE',
  score: 1,
  shuffle: false,
};

const EXTENDED_TEXT_ATTRS = {
  expectedLength: null,
  expectedLines: null,
  placeholderText: null,
  patternMask: null,
  class: null,
  responseIdentifier: 'RESPONSE',
  score: 1,
};

const ORDER_ATTRS = {
  shuffle: false,
  class: null,
  correctResponse: 'a,b',
  responseIdentifier: 'RESPONSE',
  score: 1,
};

describe('interactions whose friendly editor replaces the generic field list', () => {
  test('choice offers an editable score', async () => {
    const p = await mountPanel('qtiChoiceInteraction', CHOICE_ATTRS);
    const input = p.scoreInput();
    expect(input).toBeDefined();
    expect(input?.disabled).toBe(false);
    expect(input?.type).toBe('number');
    expect(input?.value).toBe('1');
  });

  test('extended text offers an editable score', async () => {
    const p = await mountPanel('qtiExtendedTextInteraction', EXTENDED_TEXT_ATTRS);
    expect(p.scoreInput()?.disabled).toBe(false);
  });

  test('the friendly editor still renders alongside it', async () => {
    const p = await mountPanel('qtiExtendedTextInteraction', EXTENDED_TEXT_ATTRS);
    expect(p.panel.querySelector('qti-extended-text-attributes-editor')).not.toBeNull();
    expect(p.scoreLabels()).toHaveLength(1);
  });
});

describe('interactions that render the generic field list', () => {
  test('order offers an editable score', async () => {
    const p = await mountPanel('qtiOrderInteraction', ORDER_ATTRS);
    expect(p.scoreInput()?.disabled).toBe(false);
  });

  test('no disabled copy is left behind in the read-only details', async () => {
    const p = await mountPanel('qtiOrderInteraction', ORDER_ATTRS);
    expect(p.genericScoreLabels()).toHaveLength(0);
    expect(p.scoreLabels()).toHaveLength(1);
  });
});

describe('nodes with no score attribute', () => {
  test('get no score field', async () => {
    const p = await mountPanel('qtiSimpleChoice', { identifier: 'choice1', fixed: false });
    expect(p.scoreLabels()).toHaveLength(0);
  });
});

describe('editing the field', () => {
  test('reports the new score as a number', async () => {
    const p = await mountPanel('qtiChoiceInteraction', CHOICE_ATTRS);

    let reported: unknown;
    p.panel.addEventListener('qti:attributes:change', event => {
      reported = (event as CustomEvent).detail.attrs;
    });

    const input = p.scoreInput()!;
    input.value = '3';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(reported).toEqual({ score: 3 });
  });
});
