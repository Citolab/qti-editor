/**
 * The choice interaction's editor decorations.
 *
 * Driven through a mounted `EditorView` rather than by inspecting the decoration set, because the
 * plugin's whole contract is DOM: three widgets that must render, must be clickable, and must not
 * appear where they do not belong. A decoration-set assertion would pass for a widget whose
 * `toDOM` never runs.
 *
 * The pair that matters most: `qtiSimpleChoice` is shared with the order interaction, so an order
 * interaction must come out of this completely undecorated. The plugin earns that by walking
 * `qtiChoiceInteraction` children instead of matching `qtiSimpleChoice` globally, and the last test
 * here is what keeps it honest.
 */
import { createEditor } from 'prosekit/core';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../integration/interactions/prosekit.js';
import { insertOrderInteraction } from '../../order/components/qti-order-interaction/qti-order-interaction.commands.js';
import {
  insertChoiceInteraction,
  insertSimpleChoiceOnEnter
} from '../components/qti-choice-interaction/qti-choice-interaction.commands.js';
import { QTI_OPEN_NODE_SETTINGS_EVENT } from '../../shared/extensions/node-decorations.js';
import { createChoiceInteractionDecoratorPlugin } from './choice-decorations.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { QtiOpenNodeSettingsDetail } from '../../shared/extensions/node-decorations.js';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const mounted: Array<{ view: EditorView; host: HTMLElement }> = [];

afterEach(() => {
  for (const { view, host } of mounted.splice(0)) {
    view.destroy();
    host.remove();
  }
});

/** A document holding just what `command` inserts, in a live view with the decorator installed. */
function mount(command: Command): EditorView {
  const state = EditorState.create({
    doc: schema.nodes.doc.createChecked(null, [schema.nodes.paragraph.createChecked()]),
    schema
  });

  let seeded: EditorState | null = null;
  const handled = command(state, tr => {
    seeded = state.apply(tr);
  });
  if (!handled || !seeded) throw new Error('insert command declined');

  // `insertChoiceInteraction` replaces the empty paragraph it was invoked in, so the interaction can
  // end up the last node in the document. The pill test needs somewhere outside every interaction
  // to put the caret, so give the document a trailing paragraph unconditionally.
  const seededDoc = (seeded as EditorState).doc;
  const doc =
    seededDoc.lastChild?.type.name === 'paragraph'
      ? seededDoc
      : schema.nodes.doc.createChecked(null, [...seededDoc.children, schema.nodes.paragraph.createChecked()]);

  const host = document.createElement('div');
  document.body.appendChild(host);

  const view = new EditorView(host, {
    state: EditorState.create({
      doc,
      schema,
      plugins: [createChoiceInteractionDecoratorPlugin()]
    }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });

  mounted.push({ view, host });
  return view;
}

const decorations = (view: EditorView, modifier: string): HTMLElement[] =>
  Array.from(view.dom.parentElement!.querySelectorAll<HTMLElement>(`.qti-decoration--${modifier}`));

/**
 * The anchor wiring, as the browser sees it: each choice's `anchor-name` beside the
 * `position-anchor` of the × that is supposed to point at it.
 *
 * Read from the DOM rather than the decoration set, because the failure this guards against is
 * precisely that the DOM stopped matching: `toDOM` writes `position-anchor` once, and ProseMirror
 * reuses a widget's element whenever its key is unchanged.
 */
function anchorWiring(view: EditorView): { names: string[]; refs: string[] } {
  const root = view.dom.parentElement!;
  return {
    names: Array.from(root.querySelectorAll<HTMLElement>('qti-simple-choice')).map(el =>
      el.style.getPropertyValue('anchor-name')
    ),
    refs: Array.from(root.querySelectorAll<HTMLElement>('.qti-decoration--remove')).map(el =>
      el.style.getPropertyValue('position-anchor')
    )
  };
}

/** One of the action pill's buttons, by action name. */
const action = (view: EditorView, name: string): HTMLElement | null =>
  view.dom.parentElement!.querySelector<HTMLElement>(`.qti-decoration__action--${name}`);

/** Position of the first `qtiChoiceInteraction` in the document. */
function interactionPos(doc: PmNode): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.type.name === 'qtiChoiceInteraction') {
      found = pos;
      return false;
    }
    return true;
  });
  if (found < 0) throw new Error('no choice interaction in the document');
  return found;
}

/**
 * Click into the interaction's first choice — the "clicked into" state. The `pointer` meta is what
 * ProseMirror puts on a mouse-driven selection change, and it is what arms the decorator: a
 * selection set any other way (arrow keys, a command) shows nothing.
 */
function selectInsideInteraction(view: EditorView): void {
  const pos = interactionPos(view.state.doc);
  const interaction = view.state.doc.nodeAt(pos)!;
  // +1 into the interaction, past the prompt, +2 into the choice's paragraph.
  const choicePos = pos + 1 + interaction.child(0).nodeSize;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, choicePos + 2)).setMeta('pointer', true));
}

/** Put the caret in the trailing paragraph, outside every interaction. */
function selectOutsideInteraction(view: EditorView): void {
  const { doc } = view.state;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, doc.content.size - 1)));
}

/** The interaction's choices as `{ identifier, text }`, in document order. */
function choices(doc: PmNode): Array<{ identifier: string; text: string }> {
  const interaction = doc.nodeAt(interactionPos(doc))!;
  const found: Array<{ identifier: string; text: string }> = [];
  interaction.forEach(child => {
    if (child.type.name !== 'qtiSimpleChoice') return;
    found.push({ identifier: child.attrs.identifier as string, text: child.textContent });
  });
  return found;
}

/**
 * Run `act` with `navigator.clipboard.write` stubbed, and return what it was handed as
 * `{ [mimeType]: text }`.
 *
 * Stubbed rather than read back: a headless browser grants no clipboard-read permission, and the
 * question here is what the action *writes*, which is the part that has to be reconstructible on
 * paste.
 */
async function captureClipboardWrite(act: () => Promise<void> | void): Promise<Record<string, string>> {
  const clipboard = navigator.clipboard as unknown as { write: unknown };
  const original = clipboard.write;
  const items: ClipboardItem[] = [];
  clipboard.write = async (written: ClipboardItem[]) => {
    items.push(...written);
  };

  try {
    await act();
    // The action awaits the clipboard write, and the click handler does not await the action.
    await new Promise(resolve => setTimeout(resolve, 0));
  } finally {
    clipboard.write = original;
  }

  const payload: Record<string, string> = {};
  for (const item of items) {
    for (const type of item.types) payload[type] = await (await item.getType(type)).text();
  }
  return payload;
}

describe('choice interaction decorations', () => {
  test('one × per choice, and none once a single choice is left', () => {
    const view = mount(insertChoiceInteraction);
    expect(choices(view.state.doc)).toHaveLength(3);
    expect(decorations(view, 'remove')).toHaveLength(3);

    decorations(view, 'remove')[0].click();
    expect(decorations(view, 'remove')).toHaveLength(2);

    decorations(view, 'remove')[0].click();
    expect(choices(view.state.doc)).toHaveLength(1);

    // The schema requires `qtiSimpleChoice+`, so the last row is not offered the affordance at all
    // — the guard is not merely a no-op click.
    expect(decorations(view, 'remove')).toHaveLength(0);
  });

  test('+ appends a choice structurally identical to the one Enter inserts', () => {
    const view = mount(insertChoiceInteraction);
    selectInsideInteraction(view);

    const addButtons = decorations(view, 'add');
    expect(addButtons).toHaveLength(1);
    addButtons[0].click();

    const added = choices(view.state.doc);
    expect(added).toHaveLength(4);
    expect(added[3].text).toBe('');
    expect(added[3].identifier).toMatch(/^SIMPLE_CHOICE_/);

    // Same document, Enter at the end of the last choice instead. The two nodes must agree on
    // everything but the generated identifier — that is what `createSimpleChoiceNode` is for.
    const viaEnter = mount(insertChoiceInteraction);
    const pos = interactionPos(viaEnter.state.doc);
    const interaction = viaEnter.state.doc.nodeAt(pos)!;
    const lastChoiceEnd = pos + interaction.nodeSize - 1;
    viaEnter.dispatch(viaEnter.state.tr.setSelection(TextSelection.create(viaEnter.state.doc, lastChoiceEnd - 1)));
    insertSimpleChoiceOnEnter(viaEnter.state, tr => viaEnter.dispatch(tr));

    const enterChoices = choices(viaEnter.state.doc);
    expect(enterChoices).toHaveLength(4);

    const strip = (node: PmNode) => ({ ...node.toJSON(), attrs: { ...node.attrs, identifier: 'ID' } });
    const addedNode = view.state.doc.nodeAt(interactionPos(view.state.doc))!.child(4);
    const enterNode = viaEnter.state.doc.nodeAt(interactionPos(viaEnter.state.doc))!.child(4);
    expect(strip(addedNode)).toEqual(strip(enterNode));

    // The caret lands inside the new choice, so typing continues where the author expects.
    expect(view.state.selection.from).toBeGreaterThan(interactionPos(view.state.doc));
  });

  test('removing a choice strips its identifier from correctResponse', () => {
    const view = mount(insertChoiceInteraction);
    const [first, second, third] = choices(view.state.doc).map(choice => choice.identifier);

    const pos = interactionPos(view.state.doc);
    const interaction = view.state.doc.nodeAt(pos)!;
    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, {
        ...interaction.attrs,
        correctResponse: `${first},${second}`
      })
    );

    decorations(view, 'remove')[0].click();

    const after = view.state.doc.nodeAt(interactionPos(view.state.doc))!;
    expect(after.attrs.correctResponse).toBe(second);
    expect(choices(view.state.doc).map(choice => choice.identifier)).toEqual([second, third]);

    // Removing the last correct choice clears the attribute rather than leaving an empty string.
    decorations(view, 'remove')[0].click();
    expect(view.state.doc.nodeAt(interactionPos(view.state.doc))!.attrs.correctResponse).toBe(null);
  });

  test('the action pill is emitted only while the selection is inside the interaction', () => {
    const view = mount(insertChoiceInteraction);

    selectOutsideInteraction(view);
    expect(decorations(view, 'actions')).toHaveLength(0);

    selectInsideInteraction(view);
    expect(decorations(view, 'actions')).toHaveLength(1);

    selectOutsideInteraction(view);
    expect(decorations(view, 'actions')).toHaveLength(0);
  });

  test('typing inside the interaction hides the pill and the + until the next click', () => {
    const view = mount(insertChoiceInteraction);
    selectInsideInteraction(view);
    expect(decorations(view, 'actions')).toHaveLength(1);
    expect(decorations(view, 'add')).toHaveLength(1);

    view.dispatch(view.state.tr.insertText('x'));
    // The caret is still inside the interaction — only the edit hid them.
    expect(decorations(view, 'actions')).toHaveLength(0);
    expect(decorations(view, 'add')).toHaveLength(0);
    // The × is a hover affordance, not a "clicked into" one, and stays.
    expect(decorations(view, 'remove')).toHaveLength(3);

    // Moving the caret with the keyboard is not a click: still hidden.
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, view.state.selection.from - 1)));
    expect(decorations(view, 'actions')).toHaveLength(0);

    selectInsideInteraction(view);
    expect(decorations(view, 'actions')).toHaveLength(1);
    expect(decorations(view, 'add')).toHaveLength(1);
  });

  test('Escape hides the pill and the + without moving the selection or claiming the key', () => {
    const view = mount(insertChoiceInteraction);
    selectInsideInteraction(view);
    const before = view.state.selection;

    const handled = view.someProp('handleKeyDown', f => f(view, new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(handled).toBeFalsy();
    expect(view.state.selection.eq(before)).toBe(true);
    expect(decorations(view, 'actions')).toHaveLength(0);
    expect(decorations(view, 'add')).toHaveLength(0);
  });

  test('the settings action reports the interaction the host should open, and mutates nothing', () => {
    const view = mount(insertChoiceInteraction);
    selectInsideInteraction(view);

    const seen: QtiOpenNodeSettingsDetail[] = [];
    // The pill is a widget decoration and can sit outside the editable root, so a host listens on
    // its container; the event bubbles and is composed.
    view.dom.parentElement!.addEventListener(QTI_OPEN_NODE_SETTINGS_EVENT, event => {
      seen.push((event as CustomEvent<QtiOpenNodeSettingsDetail>).detail);
    });

    action(view, 'settings')!.click();

    expect(seen).toHaveLength(1);
    expect(seen[0].nodeTypeName).toBe('qtiChoiceInteraction');
    expect(seen[0].tagName).toBe('qti-choice-interaction');
    expect(seen[0].pos).toBe(interactionPos(view.state.doc));
    expect(seen[0].attrs.responseIdentifier).toMatch(/^RESPONSE_/);
    // The pill mutates nothing: a host with no listener gets an inert pill.
    expect(view.state.doc.nodeAt(seen[0].pos)!.type.name).toBe('qtiChoiceInteraction');
  });

  test('the pill carries select, settings, copy and delete as icon-only buttons, in that order', () => {
    const view = mount(insertChoiceInteraction);
    selectInsideInteraction(view);

    const pill = decorations(view, 'actions')[0];
    // The order is the contract every future decorator inherits: destructive last.
    expect(Array.from(pill.children).map(child => child.className)).toEqual([
      'qti-decoration__action qti-decoration__action--select',
      'qti-decoration__action qti-decoration__action--settings',
      'qti-decoration__action qti-decoration__action--copy',
      'qti-decoration__action qti-decoration__action--delete qti-decoration__action--destructive'
    ]);

    // No rendered text on any of them — the names are carried accessibly instead, which is what
    // keeps the pill narrow enough not to overhang the interaction it belongs to.
    for (const name of ['select', 'settings', 'copy', 'delete']) {
      expect(action(view, name)!.textContent).toBe('');
    }
    expect(action(view, 'select')!.getAttribute('aria-label')).toBe('Select element');
    expect(action(view, 'settings')!.getAttribute('aria-label')).toBe('Settings');
    expect(action(view, 'copy')!.getAttribute('aria-label')).toBe('Copy');
    expect(action(view, 'delete')!.getAttribute('aria-label')).toBe('Delete');
  });

  test('select puts a NodeSelection on the interaction, and keeps the pill up', () => {
    const view = mount(insertChoiceInteraction);
    selectInsideInteraction(view);
    const pos = interactionPos(view.state.doc);
    const before = view.state.doc.toJSON();

    action(view, 'select')!.click();

    const { selection } = view.state;
    expect(selection).toBeInstanceOf(NodeSelection);
    expect(selection.from).toBe(pos);
    expect((selection as NodeSelection).node.type.name).toBe('qtiChoiceInteraction');
    // Selecting is a selection change, not an edit.
    expect(view.state.doc.toJSON()).toEqual(before);

    // A NodeSelection spans the interaction exactly, so the "selection is inside it" rule the pill
    // is emitted under still holds — the pill does not blink out from under the pointer.
    expect(decorations(view, 'actions')).toHaveLength(1);

    // The interaction is marked selected in the DOM, which is what decorations.css paints the
    // full-strength ring off. There is no node view for this interaction, so ProseMirror sets the
    // class itself rather than delegating to a `selectNode` hook.
    expect(view.dom.querySelector('qti-choice-interaction')!.classList).toContain('ProseMirror-selectednode');
  });

  test('copy writes the interaction to the clipboard with fresh identifiers, and changes nothing', async () => {
    const view = mount(insertChoiceInteraction);
    const pos = interactionPos(view.state.doc);
    const original = view.state.doc.nodeAt(pos)!;
    const [first, second] = choices(view.state.doc).map(choice => choice.identifier);

    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, { ...original.attrs, correctResponse: `${first},${second}` })
    );
    const before = view.state.doc.toJSON();

    const written = await captureClipboardWrite(async () => {
      selectInsideInteraction(view);
      action(view, 'copy')!.click();
    });

    // Copy is a clipboard action: the author decides where it lands, so the document is untouched.
    expect(view.state.doc.toJSON()).toEqual(before);

    // What ProseMirror reads back on paste is the `text/html`, so that is what has to be right.
    const html = written['text/html'];
    expect(html).toContain('<qti-choice-interaction');
    // `data-pm-slice` is how ProseMirror reconstructs the slice rather than re-parsing the HTML.
    expect(html).toContain('data-pm-slice');
    expect(written['text/plain']).toContain('Option A');

    // Parse the clipboard payload back and check the identifiers are new — pasting beside the
    // original must not produce two claimants to one response variable.
    const clip = new DOMParser().parseFromString(html, 'text/html');
    const copied = clip.querySelector('qti-choice-interaction')!;
    expect(copied.getAttribute('response-identifier')).not.toBe(original.attrs.responseIdentifier);
    expect(copied.getAttribute('response-identifier')).toMatch(/^RESPONSE_/);

    const copiedIds = Array.from(copied.querySelectorAll('qti-simple-choice')).map(el => el.getAttribute('identifier'));
    expect(copiedIds).toHaveLength(3);
    for (const identifier of copiedIds) expect(identifier).toMatch(/^SIMPLE_CHOICE_/);
    expect(copiedIds).not.toContain(first);

    // And the copy's correct answer names the copy's own choices, not the original's.
    expect(copied.getAttribute('correct-response')).toBe(`${copiedIds[0]},${copiedIds[1]}`);
    expect(view.state.doc.nodeAt(interactionPos(view.state.doc))!.attrs.correctResponse).toBe(`${first},${second}`);
  });

  test('delete removes the interaction, and keeps the document valid when it was the only block', () => {
    const view = mount(insertChoiceInteraction);
    selectInsideInteraction(view);
    action(view, 'delete')!.click();

    expect(view.state.doc.toJSON()).toBeTruthy();
    let remaining = 0;
    view.state.doc.descendants(node => {
      if (node.type.name === 'qtiChoiceInteraction') remaining += 1;
      return true;
    });
    expect(remaining).toBe(0);
    expect(decorations(view, 'actions')).toHaveLength(0);

    // `doc` is `block+`, so deleting the last block would be invalid. The paragraph stand-in is
    // what keeps that from throwing — and gives the caret somewhere to land.
    expect(view.state.doc.childCount).toBeGreaterThan(0);
    view.state.doc.check();
  });

  test('each × keeps pointing at its own choice after an edit shifts every position', () => {
    const view = mount(insertChoiceInteraction);

    const before = anchorWiring(view);
    expect(before.names).toHaveLength(3);
    expect(before.names).toEqual(before.refs);

    /*
     * Type into the prompt. Every choice moves, so every `anchor-name` is re-minted from its new
     * position — and the ×'s `position-anchor` has to be re-minted with it.
     *
     * This is the bug the position in the widget key exists for. With an identifier-only key the
     * elements were reused across the edit and kept their original inline `position-anchor`, so
     * every × referenced an anchor that no longer existed, stopped being positioned at all, and
     * appeared in the top-left corner of the editor as soon as its row was hovered. Nothing about
     * the decoration set was wrong — only the DOM ProseMirror had chosen to keep.
     */
    const interaction = view.state.doc.nodeAt(interactionPos(view.state.doc))!;
    const promptEnd = interactionPos(view.state.doc) + interaction.child(0).nodeSize;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, promptEnd - 1)).insertText('!!'));

    const after = anchorWiring(view);
    // The names really did change — otherwise this test would pass without proving anything.
    expect(after.names).not.toEqual(before.names);
    expect(after.names).toEqual(after.refs);
  });

  test('qtiSimpleChoice inside an order interaction gets no decorations', () => {
    const view = mount(insertOrderInteraction);

    // Same child node type as the choice interaction — and the reason the plugin walks
    // `qtiChoiceInteraction` children rather than matching `qtiSimpleChoice` globally.
    let orderChoices = 0;
    view.state.doc.descendants(node => {
      if (node.type.name === 'qtiSimpleChoice') orderChoices += 1;
      return true;
    });
    expect(orderChoices).toBeGreaterThan(0);

    expect(decorations(view, 'remove')).toHaveLength(0);
    expect(decorations(view, 'add')).toHaveLength(0);
    expect(decorations(view, 'actions')).toHaveLength(0);
  });
});

describe('promptless interactions', () => {
  /** A choice interaction built straight from the schema, with no qtiPrompt, in a live view. */
  function mountPromptless(choiceCount: number): EditorView {
    const choice = (id: string) =>
      schema.nodes.qtiSimpleChoice.createChecked(
        { identifier: id },
        schema.nodes.qtiSimpleChoiceParagraph.createChecked(null, schema.text(`Choice ${id}`))
      );
    const ids = ['A', 'B', 'C'].slice(0, choiceCount);
    const interaction = schema.nodes.qtiChoiceInteraction.createChecked(
      { responseIdentifier: 'RESPONSE', maxChoices: 1 },
      ids.map(choice)
    );
    const doc = schema.nodes.doc.createChecked(null, [interaction, schema.nodes.paragraph.createChecked()]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = new EditorView(host, {
      state: EditorState.create({ doc, schema, plugins: [createChoiceInteractionDecoratorPlugin()] })
    });
    mounted.push({ view, host });
    // Click into the first choice: the decorator emits the row affordances for the selected interaction.
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 3)).setMeta('pointer', true));
    return view;
  }

  test('a two-choice interaction without a prompt still offers a × per choice', () => {
    const view = mountPromptless(2);
    expect(view.dom.querySelectorAll('.qti-decoration--remove')).toHaveLength(2);
  });

  test('a single remaining choice offers no ×, prompt or not', () => {
    const view = mountPromptless(1);
    expect(view.dom.querySelectorAll('.qti-decoration--remove')).toHaveLength(0);
    expect(view.dom.querySelectorAll('.qti-decoration--add')).toHaveLength(1);
  });
});
