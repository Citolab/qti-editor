import { describe, expect, test } from 'vitest';

import {
  areaContainsPoint,
  areaHandles,
  clientToImagePoint,
  isValidArea,
  draftToArea,
  formatCoords,
  moveAreaCoords,
  parseCoords,
  resizeAreaCoords,
} from './area-geometry.js';

const SIZE = { width: 200, height: 100 };

describe('parseCoords', () => {
  test('reads numbers, treats empty as no coords, and rejects garbage', () => {
    expect(parseCoords('10, 20,30')).toEqual([10, 20, 30]);
    expect(parseCoords('')).toEqual([]);
    expect(parseCoords('10,x,30')).toBeNull();
    expect(parseCoords('10,Infinity,30')).toBeNull();
  });

  test('isValidArea asks for enough numbers for the shape', () => {
    expect(isValidArea('rect', [1, 2, 3])).toBe(false);
    expect(isValidArea('circle', [1, 2, 3])).toBe(true);
    expect(isValidArea('poly', [0, 0, 1, 0])).toBe(false);
    expect(isValidArea('default', [])).toBe(true);
  });

  test('formatCoords rounds to whole pixels', () => {
    expect(formatCoords([1.4, 2.6, 3])).toBe('1,3,3');
  });
});

describe('areaContainsPoint', () => {
  test.each([
    ['rect', [60, 40, 10, 10], { x: 30, y: 20 }, true],
    ['rect', [10, 10, 60, 40], { x: 70, y: 20 }, false],
    ['circle', [50, 50, 10], { x: 57, y: 57 }, true],
    ['circle', [50, 50, 10], { x: 58, y: 58 }, false],
    ['ellipse', [50, 50, 40, 10], { x: 85, y: 50 }, true],
    ['ellipse', [50, 50, 40, 10], { x: 50, y: 65 }, false],
    // A triangle; the second point sits outside it but inside its bounding box.
    ['poly', [0, 0, 100, 0, 0, 100], { x: 20, y: 20 }, true],
    ['poly', [0, 0, 100, 0, 0, 100], { x: 80, y: 80 }, false],
    ['default', [], { x: 1, y: 1 }, true],
  ] as const)('%s %j contains %j: %s', (shape, values, point, expected) => {
    expect(areaContainsPoint(shape, values, point)).toBe(expected);
  });
});

describe('moveAreaCoords', () => {
  test('moves every shape but default', () => {
    expect(moveAreaCoords('circle', [50, 50, 10], 5, -5)).toEqual([55, 45, 10]);
    expect(moveAreaCoords('ellipse', [50, 50, 20, 10], 5, 5)).toEqual([55, 55, 20, 10]);
    expect(moveAreaCoords('poly', [0, 0, 10, 0, 0, 10], 3, 4)).toEqual([3, 4, 13, 4, 3, 14]);
    expect(moveAreaCoords('default', [], 3, 4)).toEqual([]);
  });

  test('leaves an area without enough coords as it is', () => {
    expect(moveAreaCoords('rect', [1.5, 2, 3], 3, 4)).toEqual([1.5, 2, 3]);
  });

  test('with a size, stops at the image edge without changing the shape', () => {
    expect(moveAreaCoords('rect', [150, 10, 190, 30], 50, 0, SIZE)).toEqual([160, 10, 200, 30]);
    expect(moveAreaCoords('circle', [20, 50, 10], -50, 0, SIZE)).toEqual([10, 50, 10]);
  });
});

describe('handles and resizing', () => {
  test('rects have four corner handles, circles a radius handle, the rest none', () => {
    expect(areaHandles('rect', [10, 10, 50, 30]).map(h => h.id)).toEqual(['nw', 'ne', 'se', 'sw']);
    expect(areaHandles('circle', [50, 50, 10])).toEqual([{ id: 'r', x: 60, y: 50 }]);
    expect(areaHandles('poly', [0, 0, 10, 0, 0, 10])).toEqual([]);
  });

  test('dragging a rect corner past the opposite one keeps the rect normalised', () => {
    expect(resizeAreaCoords('rect', [10, 10, 50, 30], 'se', { x: 0, y: 0 })).toEqual([0, 0, 10, 10]);
  });

  test('dragging the radius handle sets the radius to the distance from the centre', () => {
    expect(resizeAreaCoords('circle', [50, 50, 10], 'r', { x: 53, y: 54 })).toEqual([50, 50, 5]);
  });
});

describe('draftToArea', () => {
  test('a drag draws a circle from its centre or a rect between its corners', () => {
    expect(draftToArea('circle', { x: 10, y: 10 }, { x: 13, y: 14 })).toEqual({ shape: 'circle', coords: [10, 10, 5] });
    expect(draftToArea('rect', { x: 50, y: 40 }, { x: 10, y: 10 })).toEqual({ shape: 'rect', coords: [10, 10, 50, 40] });
  });

  test('a click is not a draw', () => {
    expect(draftToArea('circle', { x: 10, y: 10 }, { x: 10.2, y: 10 })).toBeNull();
    expect(draftToArea('rect', { x: 10, y: 10 }, { x: 60, y: 10 })).toBeNull();
  });
});

test('clientToImagePoint maps the on-screen box to the image pixel space, clamped', () => {
  const box = { left: 100, top: 50, width: 100, height: 50 };
  expect(clientToImagePoint(box, 150, 75, SIZE)).toEqual({ x: 100, y: 50 });
  expect(clientToImagePoint(box, 500, 0, SIZE)).toEqual({ x: 200, y: 0 });
  expect(clientToImagePoint({ ...box, width: 0 }, 150, 75, SIZE)).toBeNull();
});
