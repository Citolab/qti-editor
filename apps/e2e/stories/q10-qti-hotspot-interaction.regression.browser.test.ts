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
  { index = 0, panel = false, size = { width: 206, height: 280 }, loaded = true } = {},
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
  // `loaded: false` for a picture that is meant not to load.
  if (loaded && picture instanceof HTMLImageElement) {
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
  const press = (x: number, y: number, options: { button?: 'left' | 'right'; modifiers?: Array<'Shift'> } = {}) =>
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
 * The magic wand, on a flat-colour picture made here: two blue lakes on white, split by a 2 px dark
 * dike, and an answer area A in the white on the right. 200x100 in the item's coordinate space:
 *
 *   left lake    x 20–80,   y 20–80
 *   dike         x 80–82
 *   right lake   x 82–140,  y 20–80
 *   A            x 150–190, y 50–90
 *
 * `scale` draws it at that many times the size, so its pixels are not its coordinate space.
 */
function lakesPicture(scale = 1): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200 * scale;
  canvas.height = 100 * scale;
  const context = canvas.getContext('2d')!;
  context.scale(scale, scale);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 200, 100);
  context.fillStyle = '#3b82f6';
  context.fillRect(20, 20, 60, 60);
  context.fillRect(82, 20, 58, 60);
  context.fillStyle = '#1f2937';
  context.fillRect(80, 20, 2, 60);
  return canvas.toDataURL('image/png');
}

function lakesEditor(src: string) {
  return createRegressionEditor({
    descriptor: hotspotInteractionDescriptor,
    sourceXML: `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="lakes" title="Lakes" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-hotspot-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-prompt>Click the lake.</qti-prompt>
      <img src="${src}" width="200" height="100" alt="Two lakes split by a dike"/>
      <qti-hotspot-choice identifier="A" shape="rect" coords="150,50,190,90"/>
    </qti-hotspot-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml"/>
</qti-assessment-item>`,
    transforms: () => [roundtripInteractions, roundtripItemBody],
  });
}

const LAKES = { width: 200, height: 100 };
const LEFT_LAKE = '20,20,80,20,80,80,20,80';
const BOTH_LAKES = '20,20,140,20,140,80,20,80';
const findText = (lakes: Hotspot, text: string) => findByShadowText(lakes.interaction, text, { exact: false });

test('the magic wand outlines a region as a polygon, Shift+click adds the next one, and the area scores', async () => {
  const lakes = await mountHotspot(lakesEditor(lakesPicture()), { size: LAKES });

  await (await lakes.button('Magic wand')).click();
  await userEvent.hover(lakes.interaction, { position: lakes.at(50, 50) });
  await lakes.press(50, 50);

  await expect.poll(() => lakes.choices().length).toBe(2);
  expect(lakes.choices()[1]).toMatchObject({ shape: 'poly', coords: LEFT_LAKE });
  expect(lakes.selectedChoice()).toBe(lakes.choices()[1].identifier);
  await findText(lakes, 'Shift+click a neighbouring region');

  // Shift+click the other lake: one area round both, the dike included.
  const drawn = lakes.choices()[1].identifier!;
  await lakes.press(110, 50, { modifiers: ['Shift'] });
  await expect.poll(() => lakes.choices()[1].coords).toBe(BOTH_LAKES);
  expect(lakes.choices()[1].identifier).toBe(drawn);
  // Making and extending an area never touches the answer key (max-choices 1: one value, still A's).
  expect(lakes.correct()).toEqual(['A']);

  // The white around the lakes is the background, not a region.
  await lakes.press(10, 90);
  await findText(lakes, 'No clear region here');
  expect(lakes.choices()).toHaveLength(2);

  // Escape puts the wand away; the wand's area is still selected, so the hint is how to edit it.
  await userEvent.keyboard('{Escape}');
  await findText(lakes, 'Double-click an edge to add a point');

  // Make it the answer instead of A, and play the exported item.
  await lakes.press(70, 30);
  expect(lakes.selectedChoice()).toBe(drawn);
  await (await lakes.button('Mark as correct')).click();
  await lakes.press(170, 70);
  await (await lakes.button('Unmark as correct')).click();
  expect(lakes.correct()).toEqual([drawn]);

  const xml = serialize(lakes.exported());
  expect(await scoreClicking(xml, [drawn])).toEqual({ response: drawn, score: 1 });
  expect((await scoreClicking(xml, ['A'])).score).toBe(0);
});

test('a double-click with the magic wand makes one area, not two', async () => {
  const lakes = await mountHotspot(lakesEditor(lakesPicture()), { size: LAKES });

  await (await lakes.button('Magic wand')).click();
  await lakes.doublePress(50, 50);

  await expect.poll(() => lakes.choices().length).toBe(2);
  // Give a second area every chance to appear.
  await lakes.press(10, 90);
  await findText(lakes, 'No clear region here');
  expect(lakes.choices().map(choice => choice.coords)).toEqual(['150,50,190,90', LEFT_LAKE]);

  // So does a Shift+click inside the area it already covers.
  await lakes.press(40, 60, { modifiers: ['Shift'] });
  expect(lakes.choices()).toHaveLength(2);
  expect(lakes.choices()[1].coords).toBe(LEFT_LAKE);
});

test('the magic wand works in the picture’s coordinate space when its pixels are larger', async () => {
  // Drawn at twice the size of its width / height; the wand reads it at its own 400x200.
  const lakes = await mountHotspot(lakesEditor(lakesPicture(2)), { size: LAKES });

  await (await lakes.button('Magic wand')).click();
  await lakes.press(50, 50);
  await expect.poll(() => lakes.choices()[1]?.coords).toBe(LEFT_LAKE);
});

test('a picture the wand cannot read gives a message, and the wand tries again next time', async () => {
  // Stands in for a picture from another site without CORS: either way the pixels cannot be read.
  const broken = await mountHotspot(lakesEditor('/qti/conformance/does-not-exist.png'), { size: LAKES, loaded: false });

  const wand = await broken.button('Magic wand');
  await wand.click();
  await findText(broken, 'The magic wand cannot read this image');
  await findText(broken, 'Click an area to select it');

  await (await broken.button('Select')).click();
  await expect.poll(() => queryByShadowText(broken.interaction, /cannot read this image/)).toBeNull();
  // Not given up on: a second try reads the picture again, and says so again.
  await expect.element(wand).toBeEnabled();
  await wand.click();
  await findText(broken, 'The magic wand cannot read this image');
});
