import { afterEach, expect, test } from 'vitest';
import { findByShadowText, queryByShadowText } from 'shadow-dom-testing-library';
import { page, userEvent } from 'vitest/browser';
import { NodeSelection } from 'prosemirror-state';
import { hotspotInteractionDescriptor } from '@citolab/prose-qti/components/hotspot';
import { roundtripInteractions, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';

import {
  exportAssessmentItemDoc,
  importQ10Single,
  mountEditor,
  q10Multiple,
  q10Shapes,
  q10Sv1,
} from './q10-qti-hotspot-interaction.regression.stories';
import { createRegressionEditor } from './prosemirror-base';
import { mountQtiRuntime } from './runtime-harness';
import singleXml from './fixtures/Q10-hotspot-interaction-single.xml?raw';
import snapshotXml from './__file_snapshots__/Q10-hotspot-interaction-single-editor.xml?raw';
import multipleSnapshotXml from './__file_snapshots__/Q10-hotspot-interaction-multiple-editor.xml?raw';
import shapesSnapshotXml from './__file_snapshots__/Q10-hotspot-interaction-shapes-editor.xml?raw';

import type { EditorView } from 'prosemirror-view';
import type { RegressionEditor } from './prosemirror-base';

const serialize = (doc: Document) => new XMLSerializer().serializeToString(doc);

test('exported QTI matches the Q10-hotspot-interaction-single-editor.xml snapshot', async () => {
  await expect(serialize(exportAssessmentItemDoc(importQ10Single()))).toMatchFileSnapshot(
    './__file_snapshots__/Q10-hotspot-interaction-single-editor.xml',
  );
});

test('exported QTI matches the Q10-hotspot-interaction-multiple-editor.xml snapshot', async () => {
  await expect(serialize(q10Multiple.exportAssessmentItemDoc(q10Multiple.importItem()))).toMatchFileSnapshot(
    './__file_snapshots__/Q10-hotspot-interaction-multiple-editor.xml',
  );
});

test('exported QTI matches the Q10-hotspot-interaction-shapes-editor.xml snapshot', async () => {
  await expect(serialize(q10Shapes.exportAssessmentItemDoc(q10Shapes.importItem()))).toMatchFileSnapshot(
    './__file_snapshots__/Q10-hotspot-interaction-shapes-editor.xml',
  );
});

test('exported QTI matches the Q10-hotspot-sv-1-editor.xml snapshot', async () => {
  await expect(serialize(q10Sv1.exportAssessmentItemDoc(q10Sv1.importItem()))).toMatchFileSnapshot(
    './__file_snapshots__/Q10-hotspot-sv-1-editor.xml',
  );
});

test('Q10 sv-1 keeps four interactions, each with its own answer key and cardinality', () => {
  const exported = q10Sv1.exportAssessmentItemDoc(q10Sv1.importItem());
  const interactions = Array.from(exported.querySelectorAll('qti-hotspot-interaction'));
  expect(interactions.map(interaction => interaction.getAttribute('class'))).toEqual([
    'qti-selections-light margin0auto',
    'qti-selections-dark margin0auto',
    'qti-selections-light qti-unselected-hidden margin0auto',
    'qti-selections-dark qti-unselected-hidden margin0auto',
  ]);
  const declarations = Object.fromEntries(
    Array.from(exported.querySelectorAll('qti-response-declaration')).map(declaration => [
      declaration.getAttribute('identifier'),
      {
        cardinality: declaration.getAttribute('cardinality'),
        correct: Array.from(declaration.querySelectorAll('qti-value')).map(value => value.textContent),
      },
    ]),
  );
  expect(declarations).toEqual({
    RESPONSE1: { cardinality: 'multiple', correct: ['A', 'B', 'D'] },
    RESPONSE2: { cardinality: 'single', correct: ['C'] },
    RESPONSE3: { cardinality: 'multiple', correct: [] },
    RESPONSE4: { cardinality: 'multiple', correct: [] },
  });
});

/**
 * Mount the runtime with every hotspot registered.
 *
 * The runtime the harness vendors (`@citolab/qti-components` 9.1, the version the catalog pins)
 * defines `qti-hotspot-choice` before `qti-hotspot-interaction`, so the choices announce themselves
 * before the interaction listens: none is positioned (each stays 0x0) and none is a registered
 * choice. Reconnecting them replays the announcement. That is a bug in the 9.1 runtime itself, so a
 * hotspot item played on it does not work for a real candidate either; it is fixed upstream from
 * `10.0.0-next.12`, and this goes when the catalog moves to qti-components 10 — see finding #29 in
 * docs/testing-findings.md. The clicks below are still real ones.
 */
async function mountHotspotRuntime(xml: string) {
  const harness = await mountQtiRuntime(xml);
  for (const choice of Array.from(harness.doc.querySelectorAll('qti-hotspot-choice'))) {
    // A hotspot has no text and no accessible name to find it by, so give each a test id.
    choice.setAttribute('data-testid', `hotspot-${choice.getAttribute('identifier')}`);
    choice.parentElement!.appendChild(choice);
  }
  return harness;
}

/** Click the hotspots `identifiers` in a fresh runtime of `xml` and return the score. */
async function scoreClicking(xml: string, identifiers: string[]) {
  const harness = await mountHotspotRuntime(xml);
  for (const identifier of identifiers) await harness.frame.getByTestId(`hotspot-${identifier}`).click();
  const result = { response: harness.response(), score: harness.score() };
  harness.destroy();
  return result;
}

// Q10 single: four airports on a map of the UK, max-choices 1; C (London) is correct.

test('Q10 scores 1 when the candidate clicks the correct hotspot', async () => {
  expect(await scoreClicking(snapshotXml, ['C'])).toEqual({ response: 'C', score: 1 });
});

test('Q10 scores 0 when the candidate clicks a wrong hotspot', async () => {
  expect(await scoreClicking(snapshotXml, ['A'])).toEqual({ response: 'A', score: 0 });
});

// Q10 multiple: the same map, max-choices 0; A, B and D (north of London) are correct.

test('Q10 multiple scores 1 for exactly the cities north of London', async () => {
  expect((await scoreClicking(multipleSnapshotXml, ['A', 'B', 'D'])).score).toBe(1);
});

test('Q10 multiple scores 0 when one of them is missing', async () => {
  expect((await scoreClicking(multipleSnapshotXml, ['A', 'B'])).score).toBe(0);
});

// Q10 shapes: a water lily, polygons and a circle, min-choices 1; the polygon i4 is the rhizome.

test('Q10 shapes scores 1 for the rhizome polygon and 0 for another part', async () => {
  expect(await scoreClicking(shapesSnapshotXml, ['i4'])).toEqual({ response: 'i4', score: 1 });
  expect((await scoreClicking(shapesSnapshotXml, ['i1'])).score).toBe(0);
});

/*
 * Authoring, driven with real pointer events. The drawing layer has no accessible handle of its own,
 * so gestures are addressed to the interaction element at a position computed from the picture's box;
 * the buttons are found by their text.
 */

const mounted: Array<{ view: EditorView; host: HTMLElement }> = [];

afterEach(() => {
  for (const { view, host } of mounted.splice(0)) {
    view.destroy();
    host.remove();
  }
});

const MOD = navigator.platform.toLowerCase().includes('mac') ? 'Meta' : 'Control';

/**
 * Mount `editor` and return helpers for its `index`-th hotspot interaction, whose picture is
 * 206x280 in every Q10 item but shapes. With `panel`, the attributes panel is mounted too.
 */
async function mountHotspot(
  editor: Pick<RegressionEditor, 'mountEditor' | 'exportAssessmentItemDoc'>,
  { index = 0, panel = false, size = { width: 206, height: 280 } } = {},
) {
  const host = document.createElement('div');
  host.style.width = '800px';
  document.body.appendChild(host);
  const panelEl = panel ? document.createElement('aside') : undefined;
  if (panelEl) host.appendChild(panelEl);
  const editorEl = document.createElement('div');
  host.appendChild(editorEl);
  const view = editor.mountEditor(editorEl, { panelEl, decorations: true });
  mounted.push({ view, host });

  const interaction = host.querySelectorAll<HTMLElement>('qti-hotspot-interaction')[index];
  const picture = interaction.querySelector<HTMLImageElement | HTMLObjectElement>(':scope > img, :scope > object')!;
  if (picture instanceof HTMLImageElement) {
    // Under a full parallel run the picture can take longer than the default second to load.
    await expect.poll(() => picture.complete && picture.naturalWidth > 0, { timeout: 10_000 }).toBe(true);
  }
  // The drawing layer is there once the picture's size is known.
  await expect.poll(() => interaction.shadowRoot?.querySelector('svg') != null, { timeout: 10_000 }).toBe(true);

  /** A point on the picture, in its own pixel space, relative to the interaction element. */
  const at = (x: number, y: number) => {
    const box = picture.getBoundingClientRect();
    const origin = interaction.getBoundingClientRect();
    return {
      x: box.left - origin.left + (x / size.width) * box.width,
      y: box.top - origin.top + (y / size.height) * box.height,
    };
  };
  const target = page.elementLocator(interaction);
  const button = async (text: string) => page.elementLocator(await findByShadowText(interaction, text));
  const press = (x: number, y: number) => userEvent.click(target, { position: at(x, y) });
  const drag = (from: [number, number], to: [number, number]) =>
    userEvent.dragAndDrop(target, target, { sourcePosition: at(...from), targetPosition: at(...to) });
  const exported = () => editor.exportAssessmentItemDoc(view.state.doc);
  const responseIdentifier = interaction.getAttribute('response-identifier');
  const exportedInteraction = () =>
    exported().querySelector(`qti-hotspot-interaction[response-identifier="${responseIdentifier}"]`)!;
  const choices = () =>
    Array.from(exportedInteraction().querySelectorAll('qti-hotspot-choice')).map(choice => ({
      identifier: choice.getAttribute('identifier'),
      shape: choice.getAttribute('shape'),
      coords: choice.getAttribute('coords'),
    }));
  const declaration = () =>
    exported().querySelector(`qti-response-declaration[identifier="${responseIdentifier}"]`)!;
  const correct = () => Array.from(declaration().querySelectorAll('qti-correct-response qti-value')).map(v => v.textContent);
  /** The identifier of the choice ProseMirror has selected, if a choice is what it has selected. */
  const selectedChoice = () => {
    const { selection } = view.state;
    return selection instanceof NodeSelection && selection.node.type.name === 'qtiHotspotChoice'
      ? String(selection.node.attrs.identifier)
      : null;
  };

  // A press on the picture, away from every area, selects the interaction and brings up its toolbar.
  await press(size.width - 10, 10);
  await button('Rectangle');

  return { interaction, panelEl, at, press, drag, button, choices, declaration, correct, exported, selectedChoice, view };
}

/** Each coordinate within `tolerance` image pixels: screen-to-image mapping rounds. */
function expectCoords(coords: string | null, expected: number[], tolerance = 2) {
  const actual = (coords ?? '').split(',').map(Number);
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThanOrEqual(tolerance));
}

test('drawing a rectangle adds a choice and selects it; marking it correct adds it to the answer key, as choice does', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await (await q10.button('Rectangle')).click();
  await q10.drag([20, 20], [60, 50]);

  const drawn = q10.choices()[4];
  expect(q10.choices()).toHaveLength(5);
  expect(drawn.shape).toBe('rect');
  expectCoords(drawn.coords, [20, 20, 60, 50]);
  expect(q10.selectedChoice()).toBe(drawn.identifier);

  // C is already correct; a second correct area makes the interaction multiple-response.
  await (await q10.button('Mark as correct')).click();
  expect(q10.correct()).toEqual(['C', drawn.identifier]);
  expect(q10.exported().querySelector('qti-hotspot-interaction')?.getAttribute('max-choices')).toBe('0');
  expect(q10.declaration().getAttribute('cardinality')).toBe('multiple');

  // Unmarking C makes it single-response again, with the drawn area as the answer.
  await (await q10.button('Select')).click();
  await q10.press(150, 235);
  await (await q10.button('Unmark as correct')).click();
  expect(q10.correct()).toEqual([drawn.identifier]);
  expect(q10.declaration().getAttribute('cardinality')).toBe('single');

  // The rest of the item is untouched: the other four choices and the scoring template.
  expect(q10.choices().slice(0, 4)).toEqual([
    { identifier: 'A', shape: 'circle', coords: '77,115,10' },
    { identifier: 'B', shape: 'circle', coords: '118,184,10' },
    { identifier: 'C', shape: 'circle', coords: '150,235,10' },
    { identifier: 'D', shape: 'circle', coords: '96,114,10' },
  ]);
  expect(q10.exported().querySelector('qti-response-processing')?.getAttribute('template')).toMatch(/match_correct$/);

  // And the edited item plays: the drawn area scores, the old answer no longer does.
  const xml = serialize(q10.exported());
  expect((await scoreClicking(xml, [drawn.identifier!])).score).toBe(1);
  expect((await scoreClicking(xml, ['C'])).score).toBe(0);
});

test('pressing an area selects its choice in ProseMirror; Delete removes it and its place in the answer key, undo brings both back', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await q10.press(150, 235);
  expect(q10.selectedChoice()).toBe('C');

  await userEvent.keyboard('{Delete}');
  expect(q10.choices().map(choice => choice.identifier)).toEqual(['A', 'B', 'D']);
  expect(q10.correct()).toEqual([]);

  await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
  expect(q10.choices().map(choice => choice.identifier)).toEqual(['A', 'B', 'C', 'D']);
  expect(q10.correct()).toEqual(['C']);
});

test('with an area selected, arrow keys select the next choice and typing changes nothing', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await q10.press(77, 115);
  expect(q10.selectedChoice()).toBe('A');
  await userEvent.keyboard('{ArrowRight}');
  expect(q10.selectedChoice()).toBe('B');
  // The drawing follows ProseMirror's selection.
  await expect.poll(() => q10.interaction.shadowRoot?.querySelector('[data-identifier="B"] .area--selected')).not.toBeNull();

  await userEvent.keyboard('x{Enter}');
  expect(q10.choices().map(choice => choice.identifier)).toEqual(['A', 'B', 'C', 'D']);
  expect(q10.selectedChoice()).toBe('B');
});

test('dragging a choice moves it; Delete area removes it and its place in the answer key', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  // C is the correct one in the fixture; drag it 20px left and 10px up.
  await q10.drag([150, 235], [130, 225]);
  const moved = q10.choices().find(choice => choice.identifier === 'C')!;
  expectCoords(moved.coords, [130, 225, 10]);
  expect(moved.coords!.split(',')[2]).toBe('10');
  expect(q10.correct()).toEqual(['C']);

  // Still selected after the drag.
  expect(q10.selectedChoice()).toBe('C');
  await (await q10.button('Delete area')).click();
  expect(q10.choices().map(choice => choice.identifier)).toEqual(['A', 'B', 'D']);
  expect(q10.correct()).toEqual([]);
});

test("dragging a selected circle's radius handle resizes it and keeps its centre", async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await q10.press(150, 235);
  // The radius handle sits on the circle's right edge.
  await q10.drag([160, 235], [175, 235]);

  expectCoords(q10.choices().find(choice => choice.identifier === 'C')!.coords, [150, 235, 25]);
});

test('toggling a correct area off clears the answer key', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await q10.press(150, 235);
  await (await q10.button('Unmark as correct')).click();

  expect(q10.correct()).toEqual([]);
});

test('a selected area shows its choice in the attributes panel, where hotspot-label is editable', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc }, { panel: true });

  await q10.press(77, 115);
  const section = q10.panelEl!.querySelector<HTMLElement>('fieldset[data-node-type="qtiHotspotChoice"]')!;
  expect(section).not.toBeNull();
  await userEvent.fill(page.elementLocator(section).getByLabelText('hotspotLabel'), 'Glasgow');
  await userEvent.keyboard('{Enter}');

  const choiceA = q10.exported().querySelector('qti-hotspot-choice[identifier="A"]');
  expect(choiceA?.getAttribute('hotspot-label')).toBe('Glasgow');
});

test('lowering max-choices in the panel under the marked areas exports a valid single response, and says so', async () => {
  const q10 = await mountHotspot(q10Multiple, { panel: true });
  expect(q10.correct()).toEqual(['A', 'B', 'D']);

  await q10.press(10, 10);
  const section = q10.panelEl!.querySelector<HTMLElement>('fieldset[data-node-type="qtiHotspotInteraction"]')!;
  await userEvent.fill(page.elementLocator(section).getByLabelText('maxChoices'), '1');
  await userEvent.keyboard('{Enter}');

  expect(q10.declaration().getAttribute('cardinality')).toBe('single');
  expect(q10.correct()).toEqual(['A']);
  await expect.poll(() => queryByShadowText(q10.interaction, /only the first 1 are exported/)).not.toBeNull();
});

test('an <object> picture is drawn on like an <img>', async () => {
  const objectXml = singleXml.replace(
    /<img src="images\/ukair.png"[^>]*\/>/,
    '<object type="image/png" data="images/ukair.png" width="206" height="280"><img src="images/ukair.png" alt="Map of the United Kingdom"/></object>',
  );
  const editor = createRegressionEditor({
    descriptor: hotspotInteractionDescriptor,
    sourceXML: objectXml,
    transforms: () => [roundtripInteractions, roundtripItemBody],
    assetBasePath: '/qti/conformance/Q10-hotspot',
  });
  const q10 = await mountHotspot(editor);

  await (await q10.button('Circle')).click();
  await q10.drag([40, 40], [40, 60]);

  expect(q10.choices()).toHaveLength(5);
  expectCoords(q10.choices()[4].coords, [40, 40, 20]);
  const object = q10.exported().querySelector('qti-hotspot-interaction > object');
  expect(object?.querySelector(':scope > img')?.getAttribute('alt')).toBe('Map of the United Kingdom');
});

test('in an item with several hotspot interactions, editing one leaves the others alone', async () => {
  const sv1 = await mountHotspot(q10Sv1, { index: 1 });
  const first = () =>
    Array.from(sv1.exported().querySelectorAll('qti-response-declaration[identifier="RESPONSE1"] qti-value')).map(
      value => value.textContent,
    );

  // The second interaction (RESPONSE2, single, C correct): delete C.
  await sv1.press(150, 235);
  expect(sv1.selectedChoice()).toBe('C');
  await userEvent.keyboard('{Backspace}');

  expect(sv1.choices().map(choice => choice.identifier)).toEqual(['A', 'B', 'D']);
  expect(sv1.correct()).toEqual([]);
  expect(first()).toEqual(['A', 'B', 'D']);
  expect(sv1.exported().querySelectorAll('qti-hotspot-interaction')[0].querySelectorAll('qti-hotspot-choice')).toHaveLength(4);
});
