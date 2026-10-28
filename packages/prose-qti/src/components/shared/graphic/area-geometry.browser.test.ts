import { describe, expect, test } from 'vitest';

import {
  areaContainsPoint,
  areaHandles,
  clientToImagePoint,
  isValidArea,
  draftToArea,
  formatCoords,
  insertPolyPoint,
  moveAreaCoords,
  nearestPolyEdge,
  openPolygon,
  closePolygon,
  parseCoords,
  polygonFromDraft,
  removePolyPoint,
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
  test('rects have corner handles, circles a radius, ellipses two radii, polygons one per point, default none', () => {
    expect(areaHandles('rect', [10, 10, 50, 30]).map(h => h.id)).toEqual(['nw', 'ne', 'se', 'sw']);
    expect(areaHandles('circle', [50, 50, 10])).toEqual([{ id: 'r', x: 60, y: 50 }]);
    expect(areaHandles('ellipse', [50, 50, 20, 10])).toEqual([
      { id: 'rx', x: 70, y: 50 },
      { id: 'ry', x: 50, y: 60 },
    ]);
    expect(areaHandles('poly', [0, 0, 10, 0, 0, 10])).toEqual([
      { id: 'p0', x: 0, y: 0 },
      { id: 'p1', x: 10, y: 0 },
      { id: 'p2', x: 0, y: 10 },
    ]);
    expect(areaHandles('default', [])).toEqual([]);
  });

  test('dragging a rect corner past the opposite one keeps the rect normalised', () => {
    expect(resizeAreaCoords('rect', [10, 10, 50, 30], 'se', { x: 0, y: 0 })).toEqual([0, 0, 10, 10]);
  });

  test('dragging the radius handle sets the radius to the distance from the centre', () => {
    expect(resizeAreaCoords('circle', [50, 50, 10], 'r', { x: 53, y: 54 })).toEqual([50, 50, 5]);
  });

  test('an ellipse radius handle changes only its own radius', () => {
    expect(resizeAreaCoords('ellipse', [50, 50, 20, 10], 'rx', { x: 20, y: 70 })).toEqual([50, 50, 30, 10]);
    expect(resizeAreaCoords('ellipse', [50, 50, 20, 10], 'ry', { x: 0, y: 46 })).toEqual([50, 50, 20, 4]);
    expect(resizeAreaCoords('ellipse', [50, 50, 20, 10], 'ry', { x: 0, y: 50 })).toEqual([50, 50, 20, 1]);
  });

  test('a polygon point goes where it is dragged; an unknown point changes nothing', () => {
    expect(resizeAreaCoords('poly', [0, 0, 100, 0, 50, 80], 'p2', { x: 60.4, y: 90 })).toEqual([0, 0, 100, 0, 60, 90]);
    expect(resizeAreaCoords('poly', [0, 0, 100, 0, 50, 80], 'p3', { x: 1, y: 1 })).toEqual([0, 0, 100, 0, 50, 80]);
  });
});

// Ported from qti-construction's prose-qti-graphic geometry tests.
describe('polygon points', () => {
  const triangle = [0, 0, 100, 0, 50, 80];

  test('a point is inserted on the nearest edge, and removed again', () => {
    const added = insertPolyPoint(triangle, { x: 50, y: 2 });
    expect(added).toEqual([0, 0, 50, 2, 100, 0, 50, 80]);
    expect(removePolyPoint(added, 1)).toEqual(triangle);
  });

  test('the closing edge, from the last point back to the first, counts too', () => {
    expect(nearestPolyEdge(triangle, { x: 20, y: 40 })).toMatchObject({ index: 2 });
    expect(insertPolyPoint(triangle, { x: 24, y: 39 })).toEqual([0, 0, 100, 0, 50, 80, 24, 39]);
  });

  test('a triangle keeps its three points', () => {
    expect(removePolyPoint(triangle, 0)).toEqual(triangle);
  });

  test('a closed polygon (first point repeated at the end) is opened, and closed again', () => {
    expect(openPolygon([330, 118, 357, 108, 364, 138, 330, 118])).toEqual({ values: [330, 118, 357, 108, 364, 138], closed: true });
    expect(openPolygon(triangle)).toEqual({ values: triangle, closed: false });
    // Two points and their repeat are no polygon to open: left as they are.
    expect(openPolygon([0, 0, 10, 0, 0, 0])).toEqual({ values: [0, 0, 10, 0, 0, 0], closed: false });
    expect(closePolygon(triangle)).toEqual([...triangle, 0, 0]);
  });

  test('a clicked draft becomes a polygon once it has three distinct points', () => {
    expect(polygonFromDraft([{ x: 0, y: 0 }, { x: 10.2, y: 0 }])).toBeNull();
    // The double-click that finishes a polygon lands its last point twice, and may land on the first.
    expect(
      polygonFromDraft([
        { x: 0, y: 0 },
        { x: 10.2, y: 0 },
        { x: 10, y: 10 },
        { x: 10, y: 10 },
        { x: 0, y: 0 },
      ]),
    ).toEqual([0, 0, 10, 0, 10, 10]);
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
