/**
 * An area as SVG, for the editors that draw areas on a layer over their picture. The element is in
 * the picture's own pixel space, so it belongs inside an `<svg>` whose `viewBox` is the picture's
 * size; how it looks is up to the editor's stylesheet, through `className`.
 */
import { nothing, svg } from 'lit';

import { isValidArea, type AreaShape, type AreaSize } from './area-geometry.js';

import type { TemplateResult } from 'lit';

/**
 * `values` are the parsed coords. An area without enough of them for its shape renders nothing.
 * `size` is only read for `default`, which covers the whole picture.
 */
export function renderAreaShape(
  shape: AreaShape,
  values: readonly number[],
  className: string,
  size: AreaSize = { width: 0, height: 0 },
): TemplateResult | typeof nothing {
  if (!isValidArea(shape, values)) return nothing;

  switch (shape) {
    case 'rect': {
      const [x1, y1, x2, y2] = values;
      return svg`<rect
        class=${className}
        x=${Math.min(x1, x2)}
        y=${Math.min(y1, y2)}
        width=${Math.abs(x2 - x1)}
        height=${Math.abs(y2 - y1)}
      ></rect>`;
    }
    case 'circle':
      return svg`<circle class=${className} cx=${values[0]} cy=${values[1]} r=${values[2]}></circle>`;
    case 'ellipse':
      return svg`<ellipse class=${className} cx=${values[0]} cy=${values[1]} rx=${values[2]} ry=${values[3]}></ellipse>`;
    case 'poly': {
      const points: string[] = [];
      for (let index = 0; index + 1 < values.length; index += 2) points.push(`${values[index]},${values[index + 1]}`);
      return svg`<polygon class=${className} points=${points.join(' ')}></polygon>`;
    }
    case 'default':
      return svg`<rect class=${className} x="0" y="0" width=${size.width} height=${size.height}></rect>`;
  }
}
