import { render } from 'lit';
import { expect, test } from 'vitest';

import { renderAreaShape } from './area-shape.js';

import type { AreaShape } from './area-geometry.js';

function draw(shape: AreaShape, values: number[]): Element | null {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  render(renderAreaShape(shape, values, 'area', { width: 200, height: 100 }), svg);
  return svg.querySelector('.area');
}

test.each([
  ['rect', [60, 40, 10, 10], 'rect', { x: '10', y: '10', width: '50', height: '30' }],
  ['circle', [50, 50, 10], 'circle', { cx: '50', cy: '50', r: '10' }],
  ['ellipse', [50, 50, 40, 10], 'ellipse', { cx: '50', cy: '50', rx: '40', ry: '10' }],
  ['poly', [0, 0, 100, 0, 0, 100], 'polygon', { points: '0,0 100,0 0,100' }],
  ['default', [], 'rect', { x: '0', y: '0', width: '200', height: '100' }],
] as const)('%s %j renders as <%s>', (shape, values, tag, attrs) => {
  const element = draw(shape, [...values]);
  expect(element?.localName).toBe(tag);
  for (const [name, value] of Object.entries(attrs)) expect(element?.getAttribute(name)).toBe(value);
});

test('an area without enough coords renders nothing', () => {
  expect(draw('rect', [1, 2, 3])).toBeNull();
});
