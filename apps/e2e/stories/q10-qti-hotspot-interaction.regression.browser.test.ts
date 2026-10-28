import { afterEach, expect, test } from 'vitest';
import { findByShadowText, queryByShadowText } from 'shadow-dom-testing-library';
import { page, userEvent } from 'vitest/browser';
import { NodeSelection } from 'prosemirror-state';
import { hotspotInteractionDescriptor } from '@citolab/prose-qti/components/hotspot';
import { roundtripInteractions, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';
import { formatCoords, growAreaCoords } from '@citolab/prose-qti/components/shared/graphic/area-geometry.js';

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
  // Built afresh on every use: the locator is derived from the element's text, which the toolbar's
  // hints change as the author switches tools.
  const target = () => page.elementLocator(interaction);
  const button = async (text: string) => page.elementLocator(await findByShadowText(interaction, text));
  const press = (x: number, y: number, options: { button?: 'left' | 'right' } = {}) =>
    userEvent.click(target(), { position: at(x, y), ...options });
  const doublePress = (x: number, y: number) => userEvent.dblClick(target(), { position: at(x, y) });
  const drag = (from: [number, number], to: [number, number]) =>
    userEvent.dragAndDrop(target(), target(), { sourcePosition: at(...from), targetPosition: at(...to) });
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

  return {
    interaction,
    panelEl,
    at,
    press,
    doublePress,
    drag,
    button,
    choices,
    declaration,
    correct,
    exported,
    selectedChoice,
    view,
  };
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

/*
 * Polygons and ellipses. Positions are in the picture's own 206x280 space; the top right of the
 * map, round (165, 45), is empty sea.
 */

const TRIANGLE = [
  [140, 20],
  [190, 20],
  [165, 70],
] as const;

type Hotspot = Awaited<ReturnType<typeof mountHotspot>>;

async function pressPoints(q10: Hotspot, points: ReadonlyArray<readonly [number, number]>) {
  for (const [x, y] of points) await q10.press(x, y);
}

test('drawing a polygon point by point adds a poly choice; clicking its first point closes it', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await (await q10.button('Polygon')).click();
  await pressPoints(q10, TRIANGLE);
  // Still drawing: nothing is added until the polygon is closed.
  expect(q10.choices()).toHaveLength(4);

  await q10.press(140, 20);

  const drawn = q10.choices()[4];
  expect(q10.choices()).toHaveLength(5);
  expect(drawn.shape).toBe('poly');
  expectCoords(drawn.coords, TRIANGLE.flat());
  expect(q10.selectedChoice()).toBe(drawn.identifier);
  // Drawing never touches the answer key.
  expect(q10.correct()).toEqual(['C']);
});

test('Escape cancels a polygon; Enter and a double-click finish one', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await (await q10.button('Polygon')).click();
  await pressPoints(q10, TRIANGLE.slice(0, 2));
  await userEvent.keyboard('{Escape}');
  expect(q10.choices()).toHaveLength(4);

  // Enter, after three points.
  await pressPoints(q10, TRIANGLE);
  await userEvent.keyboard('{Enter}');
  expect(q10.choices()).toHaveLength(5);
  expectCoords(q10.choices()[4].coords, TRIANGLE.flat());

  // A double-click on the last point: it is placed once, and the polygon is finished.
  await pressPoints(q10, [
    [140, 100],
    [190, 100],
  ]);
  await q10.doublePress(165, 150);
  expect(q10.choices()).toHaveLength(6);
  expectCoords(q10.choices()[5].coords, [140, 100, 190, 100, 165, 150]);
});

test('a right-click adds no point and selects nothing, and a click near the first of two points adds no near-duplicate', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await (await q10.button('Polygon')).click();
  await q10.press(140, 20);
  await q10.press(165, 45, { button: 'right' });
  await q10.press(190, 20);
  // 3 px from the first point: too close to be a new one, and two points make no polygon to close.
  await q10.press(143, 22);
  await q10.press(165, 70);
  await userEvent.keyboard('{Enter}');

  expect(q10.choices()).toHaveLength(5);
  expectCoords(q10.choices()[4].coords, TRIANGLE.flat());

  // Nor does a right-click select an area.
  await (await q10.button('Select')).click();
  await q10.press(10, 10);
  await q10.press(77, 115, { button: 'right' });
  expect(q10.selectedChoice()).toBeNull();
});

test('keys pressed while drawing a polygon stay out of the document, and document listeners still see them', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });
  const before = serialize(q10.exported());
  const seen: string[] = [];
  const listener = (event: KeyboardEvent) => {
    if (!['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) seen.push(event.key);
  };
  document.addEventListener('keydown', listener);

  try {
    await (await q10.button('Polygon')).click();
    await pressPoints(q10, TRIANGLE.slice(0, 2));
    // The interaction is selected as a node, so a key ProseMirror or the browser acted on would
    // replace it, or add a paragraph after it.
    await userEvent.keyboard(`x{Backspace}{${MOD}>}s{/${MOD}}{Escape}`);
    expect(serialize(q10.exported())).toBe(before);
    expect(seen).toEqual(['x', 'Backspace', 's', 'Escape']);

    // Enter finishes a polygon and reaches the document too; it adds no paragraph.
    await pressPoints(q10, TRIANGLE);
    await userEvent.keyboard('{Enter}');
    expect(seen.at(-1)).toBe('Enter');
    expect(q10.choices()).toHaveLength(5);
    expect(q10.view.state.doc.childCount).toBe(2);
  } finally {
    document.removeEventListener('keydown', listener);
  }
});

test('a polygon is reshaped by dragging a point, and double-clicks add and remove points', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await (await q10.button('Polygon')).click();
  await pressPoints(q10, TRIANGLE);
  await userEvent.keyboard('{Enter}');
  // The new polygon stays selected; back to the select tool to edit it.
  await (await q10.button('Select')).click();
  const polygon = () => q10.choices()[4];

  await q10.drag([165, 70], [165, 90]);
  expectCoords(polygon().coords, [140, 20, 190, 20, 165, 90]);

  // On the top edge, between its first two points: a new point there.
  await q10.doublePress(165, 20);
  expectCoords(polygon().coords, [140, 20, 165, 20, 190, 20, 165, 90]);

  // On that point: it goes again.
  await q10.doublePress(165, 20);
  expectCoords(polygon().coords, [140, 20, 190, 20, 165, 90]);

  // A triangle keeps its three points.
  await q10.doublePress(140, 20);
  expectCoords(polygon().coords, [140, 20, 190, 20, 165, 90]);
  expect(q10.choices()).toHaveLength(5);
});

test('a hand-drawn polygon marked correct scores in the runtime', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  await (await q10.button('Polygon')).click();
  await pressPoints(q10, TRIANGLE);
  await userEvent.keyboard('{Enter}');
  const drawn = q10.choices()[4].identifier!;

  await (await q10.button('Mark as correct')).click();
  await (await q10.button('Select')).click();
  await q10.press(150, 235);
  await (await q10.button('Unmark as correct')).click();
  expect(q10.correct()).toEqual([drawn]);

  const xml = serialize(q10.exported());
  expect(await scoreClicking(xml, [drawn])).toEqual({ response: drawn, score: 1 });
  expect((await scoreClicking(xml, ['C'])).score).toBe(0);
});

test('a closed polygon from an imported item is edited without its repeated point, and stays closed', async () => {
  // Q10 shapes, 680x680: i2 is a triangle whose coords repeat its first point at the end.
  const shapes = await mountHotspot(q10Shapes, { size: { width: 680, height: 680 } });
  const i2 = () => shapes.choices().find(choice => choice.identifier === 'i2')!.coords;
  expect(i2()).toBe('330,118,357,108,364,138,330,118');

  await shapes.press(350, 122);
  expect(shapes.selectedChoice()).toBe('i2');

  // Three points, not four: the triangle keeps them all.
  await shapes.doublePress(330, 118);
  expect(i2()).toBe('330,118,357,108,364,138,330,118');

  // Dragging the first point moves the repeat with it.
  await shapes.drag([330, 118], [320, 118]);
  expectCoords(i2(), [320, 118, 357, 108, 364, 138, 320, 118]);
  const values = i2()!.split(',');
  expect(values.slice(-2)).toEqual(values.slice(0, 2));
});

test("an imported ellipse is resized by its two radius handles", async () => {
  const ellipseXml = singleXml.replace(
    '<qti-hotspot-choice coords="150,235,10" identifier="C" shape="circle"/>',
    '<qti-hotspot-choice coords="150,235,20,10" identifier="C" shape="ellipse"/>',
  );
  const editor = createRegressionEditor({
    descriptor: hotspotInteractionDescriptor,
    sourceXML: ellipseXml,
    transforms: () => [roundtripInteractions, roundtripItemBody],
    assetBasePath: '/qti/conformance/Q10-hotspot',
  });
  const q10 = await mountHotspot(editor);
  const c = () => q10.choices().find(choice => choice.identifier === 'C')!;

  await q10.press(150, 235);
  expect(q10.selectedChoice()).toBe('C');

  // rx sits on the right of the centre, ry below it.
  await q10.drag([170, 235], [180, 235]);
  expectCoords(c().coords, [150, 235, 30, 10]);
  await q10.drag([150, 245], [150, 255]);
  expectCoords(c().coords, [150, 235, 30, 20]);
  expect(c().shape).toBe('ellipse');
});

/*
 * The keyboard, which acts on ProseMirror's selection (hotspot-area-keys.ts): Alt + arrow keys move
 * the selected area, + / − resize it, Escape selects the interaction.
 */

test('Alt + arrow keys move the selected area, + / − resize it, Escape selects the interaction', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });
  const text = () => q10.view.state.doc.firstChild!.textContent;
  const textBefore = text();
  const c = () => q10.choices().find(choice => choice.identifier === 'C')?.coords;

  await q10.press(150, 235);
  expect(q10.selectedChoice()).toBe('C');

  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
  expect(c()).toBe('151,235,10');
  await userEvent.keyboard('{Alt>}{Shift>}{ArrowDown}{/Shift}{/Alt}');
  expect(c()).toBe('151,245,10');
  await userEvent.keyboard('=');
  expect(c()).toBe('151,245,11');
  await userEvent.keyboard('{Shift>}+{/Shift}');
  expect(c()).toBe('151,245,21');
  await userEvent.keyboard('-');
  expect(c()).toBe('151,245,20');

  // Still C, still the answer, and no key reached the text.
  expect(q10.selectedChoice()).toBe('C');
  expect(q10.correct()).toEqual(['C']);
  expect(text()).toBe(textBefore);

  await userEvent.keyboard('{Escape}');
  expect(q10.selectedChoice()).toBeNull();
  const { selection } = q10.view.state;
  expect(selection instanceof NodeSelection && selection.node.type.name).toBe('qtiHotspotInteraction');
  expect(q10.choices()).toHaveLength(4);
});

test('+ and − grow and shrink a drawn rect and polygon on every side', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });
  const size = { width: 206, height: 280 };
  const values = (coords: string | null) => (coords ?? '').split(',').map(Number);

  await (await q10.button('Rectangle')).click();
  await q10.drag([20, 20], [60, 50]);
  const rect = values(q10.choices()[4].coords);
  await userEvent.keyboard('=');
  expect(q10.choices()[4].coords).toBe(formatCoords(growAreaCoords('rect', rect, 1, size)));
  await userEvent.keyboard('{Shift>}+{/Shift}');
  expect(q10.choices()[4].coords).toBe(formatCoords(growAreaCoords('rect', rect, 11, size)));

  await (await q10.button('Polygon')).click();
  await pressPoints(q10, TRIANGLE);
  await userEvent.keyboard('{Enter}');
  const polygon = values(q10.choices()[5].coords);
  expect(q10.selectedChoice()).toBe(q10.choices()[5].identifier);
  await userEvent.keyboard('{Shift>}+{/Shift}');
  const grown = growAreaCoords('poly', polygon, 10, size);
  expect(q10.choices()[5].coords).toBe(formatCoords(grown));
  expect(grown).not.toEqual(polygon);
  await userEvent.keyboard('-');
  expect(q10.choices()[5].coords).toBe(formatCoords(growAreaCoords('poly', grown, -1, size)));
});

test('the keyboard reaches the areas from the text, and a status line says which area is selected', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });

  // The caret in the paragraph above the map; arrow down out of it, onto the first area.
  await userEvent.click(page.getByText('choose London'));
  for (let presses = 0; presses < 6 && !q10.selectedChoice(); presses += 1) await userEvent.keyboard('{ArrowDown}');
  expect(q10.selectedChoice()).toBe('A');
  await findByShadowText(q10.interaction, 'Area 1 of 4 selected, circle: left 67, top 105, 20 by 20 px.');

  await userEvent.keyboard('{ArrowRight}');
  expect(q10.selectedChoice()).toBe('B');
  await findByShadowText(q10.interaction, 'Area 2 of 4 selected, circle: left 108, top 174, 20 by 20 px.');

  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
  await findByShadowText(q10.interaction, 'Area 2 of 4 selected, circle: left 109, top 174, 20 by 20 px.');
});

test('keys on a selected area still reach document listeners, and are only taken while an area is selected', async () => {
  const q10 = await mountHotspot({ mountEditor, exportAssessmentItemDoc });
  const seen: Array<{ key: string; taken: boolean }> = [];
  const listener = (event: KeyboardEvent) => {
    if (!['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) seen.push({ key: event.key, taken: event.defaultPrevented });
  };
  document.addEventListener('keydown', listener);

  try {
    await q10.press(150, 235);
    await userEvent.keyboard(`{Alt>}{ArrowUp}{/Alt}={${MOD}>}s{/${MOD}}{${MOD}>}={/${MOD}}{Escape}`);
    // The interaction is selected now, not an area: Alt + ↑ is ProseMirror's again (it moves the
    // selection up, as a plain ↑ does) and Escape the host editor's.
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}{Escape}');
  } finally {
    document.removeEventListener('keydown', listener);
  }

  expect(seen.map(({ key }) => key)).toEqual(['ArrowUp', '=', 's', '=', 'Escape', 'ArrowUp', 'Escape']);
  expect(seen.slice(0, 5).map(({ taken }) => taken)).toEqual([
    true,
    true,
    // An app shortcut, and the browser's zoom: not the area's.
    false,
    false,
    // Escape selects the interaction.
    true,
  ]);
  expect(q10.selectedChoice()).toBeNull();
  // Moved up once and grown once, while it was selected; not since.
  expect(q10.choices().find(choice => choice.identifier === 'C')?.coords).toBe('150,234,11');
});
