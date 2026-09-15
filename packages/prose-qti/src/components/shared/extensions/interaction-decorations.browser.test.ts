/**
 * The generic interaction decorator, through every descriptor that installs it.
 *
 * Driven through a mounted `EditorView` and installed the way a host installs it — via the
 * descriptor's `decoratorPluginFactories` — so the test proves both the plugin and the registration:
 * an interaction that forgot to opt in would fail here, not in the editor.
 *
 * The choice interaction is covered by its own test; it has a specific decorator that shares the
 * activation rule and the active class with this one.
 */
import { createEditor } from 'prosekit/core';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../integration/interactions/prosekit.js';
import {
  listSelectedInteractionDecoratorPluginFactories,
  listSelectedInteractionPluginFactories
} from '../../../core/interactions/composer.js';
import { insertExtendedTextInteraction } from '../../extended-text/components/qti-extended-text-interaction/qti-extended-text-interaction.commands.js';
import { insertGapMatchInteraction } from '../../gap-match/components/qti-gap-match-interaction/qti-gap-match-interaction.commands.js';
import { insertHottextInteraction } from '../../hottext/components/qti-hottext-interaction/qti-hottext-interaction.commands.js';
import { insertInlineChoiceInteraction } from '../../inline-choice/components/qti-inline-choice-interaction/qti-inline-choice-interaction.commands.js';
import {
  insertMatchInteraction,
  insertMatchInteractionTabular
} from '../../match/components/qti-match-interaction/qti-match-interaction.commands.js';
import { insertOrderInteraction } from '../../order/components/qti-order-interaction/qti-order-interaction.commands.js';
import { insertSelectPointInteraction } from '../../select-point/components/qti-select-point-interaction/qti-select-point-interaction.commands.js';
import { insertTextEntryInteraction } from '../../text-entry/components/qti-text-entry-interaction/qti-text-entry-interaction.commands.js';
import { QTI_ACTIVE_INTERACTION_CLASS } from './interaction-decorations.js';
import { QTI_OPEN_NODE_SETTINGS_EVENT } from './node-decorations.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { QtiOpenNodeSettingsDetail } from './node-decorations.js';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

interface Case {
  nodeTypeName: string;
  tagName: string;
  insert: Command;
}

const CASES: Case[] = [
  { nodeTypeName: 'qtiOrderInteraction', tagName: 'qti-order-interaction', insert: insertOrderInteraction },
  { nodeTypeName: 'qtiMatchInteraction', tagName: 'qti-match-interaction', insert: insertMatchInteraction },
  {
    nodeTypeName: 'qtiMatchInteractionTabular',
    tagName: 'qti-match-interaction',
    insert: insertMatchInteractionTabular
  },
  { nodeTypeName: 'qtiHottextInteraction', tagName: 'qti-hottext-interaction', insert: insertHottextInteraction },
  {
    nodeTypeName: 'qtiExtendedTextInteraction',
    tagName: 'qti-extended-text-interaction',
    insert: insertExtendedTextInteraction
  },
  {
    nodeTypeName: 'qtiSelectPointInteraction',
    tagName: 'qti-select-point-interaction',
    insert: insertSelectPointInteraction
  },
  { nodeTypeName: 'qtiGapMatchInteraction', tagName: 'qti-gap-match-interaction', insert: insertGapMatchInteraction },
  {
    nodeTypeName: 'qtiInlineChoiceInteraction',
    tagName: 'qti-inline-choice-interaction',
    insert: insertInlineChoiceInteraction
  },
  { nodeTypeName: 'qtiTextEntryInteraction', tagName: 'qti-text-entry-interaction', insert: insertTextEntryInteraction }
];

const mounted: Array<{ view: EditorView; host: HTMLElement }> = [];

afterEach(() => {
  for (const { view, host } of mounted.splice(0)) {
    view.destroy();
    host.remove();
  }
});

/** A document holding what `insert` produces, plus a trailing paragraph to click out into. */
function mount({ tagName, insert }: Case): EditorView {
  const state = EditorState.create({
    doc: schema.nodes.doc.createChecked(null, [schema.nodes.paragraph.createChecked()]),
    schema
  });

  let seeded: EditorState | null = null;
  const handled = insert(state, tr => {
    seeded = state.apply(tr);
  });
  if (!handled || !seeded) throw new Error('insert command declined');

  const seededDoc = (seeded as EditorState).doc;
  const doc = schema.nodes.doc.createChecked(null, [...seededDoc.children, schema.nodes.paragraph.createChecked()]);

  const host = document.createElement('div');
  document.body.appendChild(host);

  const include = [tagName];
  const view = new EditorView(host, {
    state: EditorState.create({
      doc,
      schema,
      plugins: [
        ...listSelectedInteractionPluginFactories({ include }).map(factory => factory()),
        ...listSelectedInteractionDecoratorPluginFactories({ include }).map(factory => factory())
      ]
    }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });

  mounted.push({ view, host });
  return view;
}

const pills = (view: EditorView): HTMLElement[] =>
  Array.from(view.dom.parentElement!.querySelectorAll<HTMLElement>('.qti-decoration--actions'));

const active = (view: EditorView): HTMLElement[] =>
  Array.from(view.dom.parentElement!.querySelectorAll<HTMLElement>(`.${QTI_ACTIVE_INTERACTION_CLASS}`));

function interactionPos(doc: PmNode, nodeTypeName: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.type.name === nodeTypeName) {
      found = pos;
      return false;
    }
    return true;
  });
  if (found < 0) throw new Error(`no ${nodeTypeName} in the document`);
  return found;
}

/**
 * Click into the interaction. Block interactions take a text caret just inside; inline atoms
 * (text entry, inline choice) take the NodeSelection a click on them produces. The `pointer` meta is
 * what arms the decorator.
 */
function clickInto(view: EditorView, nodeTypeName: string): void {
  const { doc } = view.state;
  const pos = interactionPos(doc, nodeTypeName);
  const node = doc.nodeAt(pos)!;
  const selection = node.isInline ? NodeSelection.create(doc, pos) : TextSelection.near(doc.resolve(pos + 1), 1);
  view.dispatch(view.state.tr.setSelection(selection).setMeta('pointer', true));
}

function clickOutside(view: EditorView): void {
  const { doc } = view.state;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, doc.content.size - 1)).setMeta('pointer', true));
}

describe.each(CASES)('$nodeTypeName', testCase => {
  test('clicking into it shows the wash and one pill; clicking out removes both', () => {
    const view = mount(testCase);

    expect(pills(view)).toHaveLength(0);
    expect(active(view)).toHaveLength(0);

    clickInto(view, testCase.nodeTypeName);
    expect(pills(view)).toHaveLength(1);
    const washed = active(view);
    expect(washed).toHaveLength(1);
    expect(washed[0].tagName.toLowerCase()).toBe(testCase.tagName);
    // The pill anchors to the interaction it follows.
    expect(pills(view)[0].style.getPropertyValue('position-anchor')).toBe(
      washed[0].style.getPropertyValue('anchor-name')
    );

    clickOutside(view);
    expect(pills(view)).toHaveLength(0);
    expect(active(view)).toHaveLength(0);
  });

  test('the pill carries the four generic actions and nothing else', () => {
    const view = mount(testCase);
    clickInto(view, testCase.nodeTypeName);

    const buttons = Array.from(pills(view)[0].querySelectorAll('button'));
    expect(buttons.map(button => button.className.match(/qti-decoration__action--(\w+)/)?.[1])).toEqual([
      'select',
      'settings',
      'copy',
      'delete'
    ]);
    // No type-specific affordances (the choice interaction's × and +) leak in.
    expect(view.dom.parentElement!.querySelector('.qti-decoration--add, .qti-decoration--remove')).toBeNull();
  });

  test('settings reports this interaction to the host and mutates nothing', () => {
    const view = mount(testCase);
    clickInto(view, testCase.nodeTypeName);
    const docBefore = view.state.doc;

    const seen: QtiOpenNodeSettingsDetail[] = [];
    view.dom.parentElement!.addEventListener(QTI_OPEN_NODE_SETTINGS_EVENT, event => {
      seen.push((event as CustomEvent<QtiOpenNodeSettingsDetail>).detail);
    });

    pills(view)[0].querySelector<HTMLElement>('.qti-decoration__action--settings')!.click();

    expect(seen).toHaveLength(1);
    expect(seen[0].nodeTypeName).toBe(testCase.nodeTypeName);
    expect(seen[0].tagName).toBe(testCase.tagName);
    expect(seen[0].pos).toBe(interactionPos(view.state.doc, testCase.nodeTypeName));
    expect(view.state.doc.eq(docBefore)).toBe(true);
  });

  test('Escape hides the pill without moving the selection', () => {
    const view = mount(testCase);
    clickInto(view, testCase.nodeTypeName);
    const before = view.state.selection;

    view.someProp('handleKeyDown', f => f(view, new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(view.state.selection.eq(before)).toBe(true);
    expect(pills(view)).toHaveLength(0);
    expect(active(view)).toHaveLength(0);
  });
});
