// Ported from qti-construction's prose-qti-graphic `magicWand.test.ts`, plus the MagicWand class.
import { describe, expect, test } from 'vitest';

import {
  MagicWand,
  floodRegion,
  mergeRegions,
  outlineOf,
  simplifyOutline,
  traceOutline,
  wandPolygon,
  wandRegion,
} from './magic-wand.js';

import type { ImagePixels } from './image-pixels.js';

/** A picture from rows of characters, one colour each: `.` white, `#` a dark border, letters flat fills. */
function picture(rows: string[]): ImagePixels {
  const colours: Record<string, [number, number, number]> = {
    '.': [255, 255, 255],
    '#': [40, 40, 40],
    a: [240, 200, 180],
    b: [180, 210, 240],
  };
  const width = rows[0].length;
  const height = rows.length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) => [...row].forEach((c, x) => data.set([...colours[c], 255], (y * width + x) * 4)));
  return { width, height, data };
}

const count = (mask: Uint8Array) => mask.reduce((n, v) => n + v, 0);

describe('magic wand', () => {
  test('floods the clicked colour, stopping at other colours', () => {
    const p = picture(['......', '.aa#b.', '.aa#b.', '......']);
    expect(count(floodRegion(p, { x: 1, y: 1 }))).toBe(4);
    expect(count(floodRegion(p, { x: 4, y: 2 }))).toBe(2);
  });

  test('traces a rectangle as its four corners, clockwise', () => {
    const p = picture(['.....', '.aaa.', '.aaa.', '.....']);
    const outline = traceOutline(floodRegion(p, { x: 2, y: 1 }), p.width, p.height);
    expect(outline).toEqual([
      { x: 1, y: 1 },
      { x: 4, y: 1 },
      { x: 4, y: 3 },
      { x: 1, y: 3 },
    ]);
  });

  test('follows a concave region (an L)', () => {
    const p = picture(['.....', '.aa..', '.aa..', '.aaa.', '.....']);
    const outline = traceOutline(floodRegion(p, { x: 1, y: 1 }), p.width, p.height);
    expect(outline).toEqual([
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 1, y: 4 },
    ]);
  });

  test('gives the outside of a region with a hole (a label inside a province)', () => {
    const p = picture(['.......', '.aaaaa.', '.a#.#a.', '.aaaaa.', '.......']);
    const outline = traceOutline(floodRegion(p, { x: 1, y: 1 }), p.width, p.height);
    expect(outline).toEqual([
      { x: 1, y: 1 },
      { x: 6, y: 1 },
      { x: 6, y: 4 },
      { x: 1, y: 4 },
    ]);
  });

  test('refuses the background of the whole image and a speck', () => {
    const p = picture(['..........', '..........', '...a......', '..........']);
    expect(wandPolygon(p, { x: 0, y: 0 })).toBeNull();
    expect(wandPolygon(p, { x: 3, y: 2 })).toBeNull();
  });

  test('refuses the sea round a map: it reaches every edge, however little of the image it covers', () => {
    const p = picture(['......', '.aaaa.', '.aaaa.', '.aaaa.', '......']);
    expect(wandPolygon(p, { x: 0, y: 0 }, { maxShare: 1 })).toBeNull();
    expect(wandPolygon(p, { x: 2, y: 2 }, { minPixels: 1 })).not.toBeNull();
  });

  test("returns the region's pixels also when it refuses it, so a hover preview can reuse them", () => {
    const p = picture(['..........', '..........', '...a......', '..........']);
    const refused = wandRegion(p, { x: 0, y: 0 });
    expect(refused.polygon).toBeNull();
    expect(count(refused.mask)).toBe(39);
  });

  test('outlines a region inside its borders', () => {
    const rows = ['############'];
    for (let i = 0; i < 8; i++) rows.push('#aaaaaa#bbb#');
    rows.push('############');
    const polygon = wandPolygon(picture(rows), { x: 3, y: 4 }, { minPixels: 1, maxShare: 1 });
    expect(polygon).toEqual([
      { x: 1, y: 1 },
      { x: 7, y: 1 },
      { x: 7, y: 9 },
      { x: 1, y: 9 },
    ]);
  });

  test('merges two lakes across a thin dike into one region (Shift+click)', () => {
    const p = picture(['..........', '.bbbb#bbb.', '.bbbb#bbb.', '.bbbb#bbb.', '..........']);
    const left = floodRegion(p, { x: 1, y: 1 });
    const right = floodRegion(p, { x: 7, y: 1 });
    const merged = mergeRegions(left, right, p.width, p.height, 1)!;
    expect(merged).not.toBeNull();
    // Both lakes and the dike between them.
    expect(count(merged)).toBe(3 * 8);
    expect(outlineOf(merged, p.width, p.height)).toEqual([
      { x: 1, y: 1 },
      { x: 9, y: 1 },
      { x: 9, y: 4 },
      { x: 1, y: 4 },
    ]);
  });

  test('does not merge regions that do not touch across a thin line', () => {
    const p = picture(['..........', '.bb....bb.', '.bb....bb.', '..........']);
    const left = floodRegion(p, { x: 1, y: 1 });
    const right = floodRegion(p, { x: 7, y: 1 });
    expect(mergeRegions(left, right, p.width, p.height, 1)).toBeNull();
  });

  test('simplifies a ragged outline to at most the given number of points', () => {
    // A circle-ish staircase of 400 corners.
    const ring = Array.from({ length: 400 }, (_, i) => ({
      x: Math.round(100 + 80 * Math.cos((i / 400) * 2 * Math.PI)),
      y: Math.round(100 + 80 * Math.sin((i / 400) * 2 * Math.PI)),
    }));
    const simple = simplifyOutline(ring, 24);
    expect(simple.length).toBeLessThanOrEqual(24);
    expect(simple.length).toBeGreaterThanOrEqual(8);
  });
});

describe('MagicWand', () => {
  // Two 6x6 lakes split by a one-pixel dike, on a white frame: 16x8 pixels.
  const rows = ['................'];
  for (let i = 0; i < 6; i++) rows.push('.bbbbbb#bbbbbb..');
  rows.push('................');
  const pixels = picture(rows);

  test("gives area coords in the picture's own space when the pixels are a scaled-down copy", () => {
    // The pixels are 16x8; the picture's coords are measured at twice that.
    const wand = new MagicWand(pixels, { width: 32, height: 16 });
    expect(wand.pick({ x: 4, y: 4 })).toMatchObject({ coords: [2, 2, 14, 2, 14, 14, 2, 14] });
  });

  test('says why a click makes nothing', () => {
    const wand = new MagicWand(pixels, { width: 16, height: 8 });
    expect(wand.pick({ x: 0, y: 0 })).toEqual({ miss: 'noRegion' });
    expect(wand.preview({ x: 0, y: 0 })).toBeNull();
  });

  test('Shift+click adds a neighbouring region to the last area', () => {
    const wand = new MagicWand(pixels, { width: 16, height: 8 });
    const first = wand.pick({ x: 2, y: 2 });
    if (!('coords' in first)) throw new Error('expected a region');
    const last = { identifier: 'A', coords: first.coords.join(','), mask: first.mask };

    // Both lakes and the dike; the left lake starts one pixel from the edge and keeps that pixel.
    expect(wand.pick({ x: 10, y: 2 }, last)).toMatchObject({ coords: [1, 1, 14, 1, 14, 7, 1, 7] });
  });

  test('Shift+click on a region that does not touch the last area adds nothing', () => {
    const apartRows = ['......................'];
    for (let i = 0; i < 6; i++) apartRows.push('.bbbbbb........bbbbbb.');
    apartRows.push('......................');
    const wand = new MagicWand(picture(apartRows), { width: 22, height: 8 });
    const first = wand.pick({ x: 2, y: 2 });
    if (!('coords' in first)) throw new Error('expected a region');

    expect(wand.pick({ x: 17, y: 2 }, { identifier: 'A', coords: first.coords.join(','), mask: first.mask })).toEqual({
      miss: 'notTouching',
    });
  });
});
