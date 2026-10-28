import { afterEach, expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';
import { page, userEvent } from 'vitest/browser';

import { exportAssessmentItemDoc, importItem016, mountEditor } from './item016-qti-select-point-interaction.regression.stories';

import type { EditorView } from 'prosemirror-view';

test('exported QTI matches the ITEM016-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem016());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM016-editor.xml');
});

test.skip('ITEM016 snapshot scores in the runtime via select-point area mapping', async () => {
  // ITEM016 uses select-point with area mapping (map_response_point template)
  // — scoring depends on the click coordinates falling inside a defined area.
  // The source XML has an empty <qti-correct-response>; the score comes from
  // the area-map definitions, not from comparing exact points. Re-enable when
  // we author a coordinate-aware staging helper.
});

/*
 * Authoring the scoring areas, driven with real pointer events. The drawing layer has no accessible
 * handle of its own, so gestures are addressed to the interaction element at a position computed from
 * the picture's box; the toolbar buttons are found by their text.
 */

const mounted: Array<{ view: EditorView; host: HTMLElement }> = [];

afterEach(() => {
  for (const { view, host } of mounted.splice(0)) {
    view.destroy();
    host.remove();
  }
});

/** ITEM016's map is 600x513 and has one area, a circle at 191,393 with radius 10. */
async function mountItem016() {
  const host = document.createElement('div');
  host.style.width = '800px';
  document.body.appendChild(host);
  const view = mountEditor(host);
  mounted.push({ view, host });

  const interaction = host.querySelector<HTMLElement>('qti-select-point-interaction')!;
  const image = interaction.querySelector<HTMLImageElement>(':scope > img')!;
  // Under a full parallel run the map can take longer than the default second to load.
  await expect.poll(() => image.complete && image.naturalWidth > 0, { timeout: 10_000 }).toBe(true);

  /** A point on the map, in its own 600x513 pixel space, relative to the interaction element. */
  const at = (x: number, y: number) => {
    const box = image.getBoundingClientRect();
    const origin = interaction.getBoundingClientRect();
    return {
      x: box.left - origin.left + (x / 600) * box.width,
      y: box.top - origin.top + (y / 513) * box.height,
    };
  };
  const target = page.elementLocator(interaction);
  const button = async (text: string) => page.elementLocator(await findByShadowText(host, text));
  const drag = (from: [number, number], to: [number, number]) =>
    userEvent.dragAndDrop(target, target, { sourcePosition: at(...from), targetPosition: at(...to) });
  const areas = () =>
    Array.from(exportAssessmentItemDoc(view.state.doc).querySelectorAll('qti-area-map-entry')).map(entry => ({
      shape: entry.getAttribute('shape'),
      coords: (entry.getAttribute('coords') ?? '').split(',').map(Number),
    }));

  // A press on the map is what brings up the toolbar.
  await userEvent.click(target, { position: at(550, 30) });
  await button('Circle');

  return { button, drag, areas };
}

/** Each coordinate within `tolerance` image pixels: screen-to-image mapping rounds. */
function expectCoords(actual: number[], expected: number[], tolerance = 2) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThanOrEqual(tolerance));
}

test('drawing a circle and a rect adds two scoring areas', async () => {
  const item = await mountItem016();

  await (await item.button('Circle')).click();
  await item.drag([100, 100], [130, 140]);
  await (await item.button('Rect')).click();
  await item.drag([300, 50], [360, 90]);

  const [original, circle, rect] = item.areas();
  expect(item.areas()).toHaveLength(3);
  expect(original).toEqual({ shape: 'circle', coords: [191, 393, 10] });
  expect(circle.shape).toBe('circle');
  expectCoords(circle.coords, [100, 100, 50]);
  expect(rect.shape).toBe('rect');
  expectCoords(rect.coords, [300, 50, 360, 90]);
});

test('a drag too small to mean anything draws no area', async () => {
  const item = await mountItem016();

  await (await item.button('Rect')).click();
  await item.drag([300, 50], [300, 50]);

  expect(item.areas()).toHaveLength(1);
});

test('dragging an area in select mode moves it and keeps its size', async () => {
  const item = await mountItem016();

  await (await item.button('Rect')).click();
  await item.drag([300, 50], [360, 90]);
  await (await item.button('Select')).click();
  await item.drag([191, 393], [211, 383]);
  await item.drag([330, 70], [350, 100]);

  const [circle, rect] = item.areas();
  expectCoords(circle.coords, [211, 383, 10]);
  expect(circle.coords[2]).toBe(10);
  expectCoords(rect.coords, [320, 80, 380, 120]);
  expect(rect.coords[2] - rect.coords[0]).toBe(60);
  expect(rect.coords[3] - rect.coords[1]).toBe(40);
});
