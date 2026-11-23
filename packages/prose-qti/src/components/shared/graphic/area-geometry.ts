/**
 * Geometry for QTI areas — the `shape` + `coords` pair that `qti-hotspot-choice`,
 * `qti-area-map-entry` and their relatives use to describe a region of an image.
 *
 * Coordinates are in the image's own pixel space (its `width` / `height`), never in screen pixels:
 *
 *   rect     x1,y1,x2,y2
 *   circle   cx,cy,r
 *   ellipse  cx,cy,rx,ry
 *   poly     x1,y1,x2,y2,…      (at least three points)
 *   default  (no coords)        the whole image
 *
 * Pure functions with no DOM or Lit dependency, for the editors of the image-based interactions, so
 * they all draw, hit-test and move areas identically. `area-shape.ts` renders an area as SVG. Every function that produces coordinates rounds
 * them to whole pixels, which is what an author-facing `coords` attribute holds.
 */

export type AreaShape = 'rect' | 'circle' | 'ellipse' | 'poly' | 'default';

/** The shapes an author can draw with the mouse. The others are kept and moved, never created. */
export type DrawableAreaShape = 'rect' | 'circle';

export interface AreaPoint {
  x: number;
  y: number;
}

export interface AreaSize {
  width: number;
  height: number;
}

/** A drag handle on an area: `nw`/`ne`/`se`/`sw` for a rect's corners, `r` for a circle's radius. */
export interface AreaHandle extends AreaPoint {
  id: string;
}

const AREA_SHAPES = new Set<string>(['rect', 'circle', 'ellipse', 'poly', 'default']);

export function isAreaShape(value: unknown): value is AreaShape {
  return typeof value === 'string' && AREA_SHAPES.has(value);
}

/**
 * Parse a `coords` attribute. Returns `null` when any value is not a finite number, so a malformed
 * area is skipped rather than drawn at the origin. An empty string parses to `[]` (the `default`
 * shape).
 */
export function parseCoords(coords: string | null | undefined): number[] | null {
  const trimmed = (coords ?? '').trim();
  if (trimmed === '') return [];
  const values = trimmed.split(',').map(value => Number(value.trim()));
  return values.some(value => !Number.isFinite(value)) ? null : values;
}

export function formatCoords(values: readonly number[]): string {
  return values.map(value => String(Math.round(value))).join(',');
}

/** Whether `values` hold enough numbers to draw `shape`. */
export function isValidArea(shape: AreaShape, values: readonly number[]): boolean {
  switch (shape) {
    case 'rect':
    case 'ellipse':
      return values.length >= 4;
    case 'circle':
      return values.length >= 3;
    case 'poly':
      return values.length >= 6;
    case 'default':
      return true;
  }
}

/** Axis-aligned bounding box; `size` is only needed for `default`, which covers the whole image. */
export function areaBounds(
  shape: AreaShape,
  values: readonly number[],
  size: AreaSize = { width: 0, height: 0 },
): { x: number; y: number; width: number; height: number } {
  switch (shape) {
    case 'rect': {
      const [x1, y1, x2, y2] = values;
      return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
    }
    case 'circle': {
      const [cx, cy, r] = values;
      return { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r };
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = values;
      return { x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry };
    }
    case 'poly': {
      const xs = values.filter((_, index) => index % 2 === 0);
      const ys = values.filter((_, index) => index % 2 === 1);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }
    case 'default':
      return { x: 0, y: 0, width: size.width, height: size.height };
  }
}

/** Whether `point` falls inside the area. `default` contains every point. */
export function areaContainsPoint(shape: AreaShape, values: readonly number[], point: AreaPoint): boolean {
  if (!isValidArea(shape, values)) return false;
  const { x, y } = point;

  switch (shape) {
    case 'rect': {
      const bounds = areaBounds(shape, values);
      return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
    }
    case 'circle': {
      const [cx, cy, r] = values;
      return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = values;
      if (rx <= 0 || ry <= 0) return false;
      return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    }
    case 'poly': {
      // Even-odd ray casting.
      let inside = false;
      const count = Math.floor(values.length / 2);
      for (let i = 0, j = count - 1; i < count; j = i++) {
        const [xi, yi] = [values[2 * i], values[2 * i + 1]];
        const [xj, yj] = [values[2 * j], values[2 * j + 1]];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    case 'default':
      return true;
  }
}

/**
 * Translate an area by `(dx, dy)`. Every shape can be moved, `default` excepted — it is the whole
 * image by definition. Without `size` the move is unbounded; with it, the area stops at the image edge
 * without changing size.
 */
export function moveAreaCoords(
  shape: AreaShape,
  values: readonly number[],
  dx: number,
  dy: number,
  size?: AreaSize,
): number[] {
  if (shape === 'default' || !isValidArea(shape, values)) return [...values];

  let mx = dx;
  let my = dy;
  if (size) {
    const bounds = areaBounds(shape, values, size);
    mx = clamp(dx, -bounds.x, size.width - (bounds.x + bounds.width));
    my = clamp(dy, -bounds.y, size.height - (bounds.y + bounds.height));
  }

  switch (shape) {
    case 'rect':
      return round([values[0] + mx, values[1] + my, values[2] + mx, values[3] + my]);
    case 'circle':
      return round([values[0] + mx, values[1] + my, values[2]]);
    case 'ellipse':
      return round([values[0] + mx, values[1] + my, values[2], values[3]]);
    case 'poly':
      return round(values.map((value, index) => value + (index % 2 === 0 ? mx : my)));
  }
}

/** The resize handles of an area. Only the drawable shapes have them; poly and ellipse move whole. */
export function areaHandles(shape: AreaShape, values: readonly number[]): AreaHandle[] {
  if (!isValidArea(shape, values)) return [];
  if (shape === 'rect') {
    const { x, y, width, height } = areaBounds(shape, values);
    return [
      { id: 'nw', x, y },
      { id: 'ne', x: x + width, y },
      { id: 'se', x: x + width, y: y + height },
      { id: 'sw', x, y: y + height },
    ];
  }
  if (shape === 'circle') return [{ id: 'r', x: values[0] + values[2], y: values[1] }];
  return [];
}

const MIN_AREA_SIZE = 1;

/** Drag one of {@link areaHandles} to `point`. A rect stays normalised (`x1 < x2`, `y1 < y2`). */
export function resizeAreaCoords(
  shape: AreaShape,
  values: readonly number[],
  handle: string,
  point: AreaPoint,
): number[] {
  if (shape === 'rect' && isValidArea(shape, values)) {
    const bounds = areaBounds(shape, values);
    let [x1, y1, x2, y2] = [bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height];
    if (handle.includes('w')) x1 = point.x;
    if (handle.includes('e')) x2 = point.x;
    if (handle.includes('n')) y1 = point.y;
    if (handle.includes('s')) y2 = point.y;
    const [left, right] = [Math.min(x1, x2), Math.max(x1, x2)];
    const [top, bottom] = [Math.min(y1, y2), Math.max(y1, y2)];
    return round([left, top, Math.max(right, left + MIN_AREA_SIZE), Math.max(bottom, top + MIN_AREA_SIZE)]);
  }
  if (shape === 'circle' && handle === 'r' && isValidArea(shape, values)) {
    const [cx, cy] = values;
    return round([cx, cy, Math.max(MIN_AREA_SIZE, Math.hypot(point.x - cx, point.y - cy))]);
  }
  return [...values];
}

/**
 * The area a drag from `start` to `end` draws: a circle centred on `start` through `end`, or the
 * rect spanning both. `null` when the drag was too small to mean anything — a click, not a draw.
 */
export function draftToArea(
  shape: DrawableAreaShape,
  start: AreaPoint,
  end: AreaPoint,
): { shape: DrawableAreaShape; coords: number[] } | null {
  if (shape === 'circle') {
    const radius = Math.round(Math.hypot(end.x - start.x, end.y - start.y));
    if (radius < MIN_AREA_SIZE) return null;
    return { shape, coords: [Math.round(start.x), Math.round(start.y), radius] };
  }

  const x1 = Math.round(Math.min(start.x, end.x));
  const y1 = Math.round(Math.min(start.y, end.y));
  const x2 = Math.round(Math.max(start.x, end.x));
  const y2 = Math.round(Math.max(start.y, end.y));
  if (x2 - x1 < MIN_AREA_SIZE || y2 - y1 < MIN_AREA_SIZE) return null;
  return { shape, coords: [x1, y1, x2, y2] };
}

/**
 * Map a pointer position to the image's own pixel space, clamped to the image. `box` is the image's
 * on-screen rectangle; `size` its declared size (what `coords` are relative to).
 */
export function clientToImagePoint(
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  size: AreaSize,
): AreaPoint | null {
  if (box.width === 0 || box.height === 0) return null;
  const x = ((clientX - box.left) / box.width) * size.width;
  const y = ((clientY - box.top) / box.height) * size.height;
  return { x: clamp(x, 0, size.width), y: clamp(y, 0, size.height) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function round(values: number[]): number[] {
  return values.map(value => Math.round(value));
}
