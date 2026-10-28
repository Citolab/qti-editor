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
 *
 * The polygon and ellipse helpers are ported from qti-construction's `prose-qti-graphic`
 * (`geometry.ts`, `cardEditing.ts`), reshaped to this module's `(shape, values)` signatures.
 *
 * A polygon is not checked for self-intersection: dragging a point across an edge gives a bow tie,
 * which is kept as it is. Hit-testing is even-odd, so the part where the bow tie overlaps itself
 * does not count as inside.
 */

export type AreaShape = 'rect' | 'circle' | 'ellipse' | 'poly' | 'default';

/**
 * The shapes an author can draw by dragging. A polygon is drawn point by point instead (see
 * {@link polygonFromDraft}); ellipse and default are kept and edited, never created.
 */
export type DrawableAreaShape = 'rect' | 'circle';

export interface AreaPoint {
  x: number;
  y: number;
}

export interface AreaSize {
  width: number;
  height: number;
}

/**
 * A drag handle on an area: `nw`/`ne`/`se`/`sw` for a rect's corners, `r` for a circle's radius,
 * `rx`/`ry` for an ellipse's radii and `p0`, `p1`, … for a polygon's points.
 */
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

/** The resize handles of an area, see {@link AreaHandle}. `default` has none. */
export function areaHandles(shape: AreaShape, values: readonly number[]): AreaHandle[] {
  if (!isValidArea(shape, values)) return [];
  switch (shape) {
    case 'rect': {
      const { x, y, width, height } = areaBounds(shape, values);
      return [
        { id: 'nw', x, y },
        { id: 'ne', x: x + width, y },
        { id: 'se', x: x + width, y: y + height },
        { id: 'sw', x, y: y + height },
      ];
    }
    case 'circle':
      return [{ id: 'r', x: values[0] + values[2], y: values[1] }];
    case 'ellipse':
      return [
        { id: 'rx', x: values[0] + values[2], y: values[1] },
        { id: 'ry', x: values[0], y: values[1] + values[3] },
      ];
    case 'poly':
      return polyPoints(values).map((point, index) => ({ id: `p${index}`, ...point }));
    case 'default':
      return [];
  }
}

const MIN_AREA_SIZE = 1;

/**
 * Drag one of {@link areaHandles} to `point`. A rect stays normalised (`x1 < x2`, `y1 < y2`); a
 * radius never drops below one pixel; a polygon point simply goes where it is dragged.
 */
export function resizeAreaCoords(
  shape: AreaShape,
  values: readonly number[],
  handle: string,
  point: AreaPoint,
): number[] {
  if (!isValidArea(shape, values)) return [...values];

  if (shape === 'rect') {
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
  if (shape === 'circle' && handle === 'r') {
    const [cx, cy] = values;
    return round([cx, cy, Math.max(MIN_AREA_SIZE, Math.hypot(point.x - cx, point.y - cy))]);
  }
  if (shape === 'ellipse' && handle === 'rx') {
    return round([values[0], values[1], Math.max(MIN_AREA_SIZE, Math.abs(point.x - values[0])), values[3]]);
  }
  if (shape === 'ellipse' && handle === 'ry') {
    return round([values[0], values[1], values[2], Math.max(MIN_AREA_SIZE, Math.abs(point.y - values[1]))]);
  }
  if (shape === 'poly' && /^p\d+$/.test(handle)) {
    const index = Number(handle.slice(1));
    if (2 * index + 1 >= values.length) return [...values];
    const next = [...values];
    next[2 * index] = point.x;
    next[2 * index + 1] = point.y;
    return round(next);
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

/** A polygon's points, from its flat `x1,y1,x2,y2,…` values. */
export function polyPoints(values: readonly number[]): AreaPoint[] {
  const points: AreaPoint[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) points.push({ x: values[index], y: values[index + 1] });
  return points;
}

/**
 * The polygon edge closest to `point`: `index` is the edge from point `index` to the next one (the
 * last edge closes the ring). `null` for fewer than two points.
 */
export function nearestPolyEdge(values: readonly number[], point: AreaPoint): { index: number; distance: number } | null {
  const points = polyPoints(values);
  if (points.length < 2) return null;
  let best = { index: 0, distance: Infinity };
  points.forEach((start, index) => {
    const distance = distanceToSegment(point, start, points[(index + 1) % points.length]);
    if (distance < best.distance) best = { index, distance };
  });
  return best;
}

/** Add a polygon point at `point`, on the nearest edge. */
export function insertPolyPoint(values: readonly number[], point: AreaPoint): number[] {
  const edge = nearestPolyEdge(values, point);
  if (!edge) return [...values];
  const points = polyPoints(values);
  points.splice(edge.index + 1, 0, point);
  return round(points.flatMap(({ x, y }) => [x, y]));
}

/** Remove polygon point `index`. A polygon keeps at least three points, so a triangle is left alone. */
export function removePolyPoint(values: readonly number[], index: number): number[] {
  const points = polyPoints(values);
  if (points.length <= 3 || index < 0 || index >= points.length) return [...values];
  return points.filter((_, candidate) => candidate !== index).flatMap(({ x, y }) => [x, y]);
}

/**
 * The polygon an author clicked point by point, as `coords` values, or `null` while it has fewer
 * than three distinct points. Repeated points (a double-click lands twice) count once.
 */
export function polygonFromDraft(points: readonly AreaPoint[]): number[] | null {
  const distinct: AreaPoint[] = [];
  for (const point of points) {
    const rounded = { x: Math.round(point.x), y: Math.round(point.y) };
    const previous = distinct[distinct.length - 1];
    if (!previous || previous.x !== rounded.x || previous.y !== rounded.y) distinct.push(rounded);
  }
  while (distinct.length > 1 && distinct[0].x === distinct[distinct.length - 1].x && distinct[0].y === distinct[distinct.length - 1].y) {
    distinct.pop();
  }
  return distinct.length >= 3 ? distinct.flatMap(({ x, y }) => [x, y]) : null;
}

/**
 * A polygon without the closing point some items repeat (`x1,y1,…,x1,y1`), and whether it had one.
 * QTI does not need the repeat, and an editor that kept it would draw two handles on one spot and
 * count a duplicate towards a polygon's three points. Write the polygon back with
 * {@link closePolygon} when `closed`, to keep the item's own convention.
 */
export function openPolygon(values: readonly number[]): { values: number[]; closed: boolean } {
  const count = Math.floor(values.length / 2);
  const closed = count >= 4 && values[0] === values[2 * count - 2] && values[1] === values[2 * count - 1];
  return { values: closed ? values.slice(0, 2 * count - 2) : [...values], closed };
}

/** A polygon with its first point repeated at the end; see {@link openPolygon}. */
export function closePolygon(values: readonly number[]): number[] {
  return values.length >= 2 ? [...values, values[0], values[1]] : [...values];
}

/** Whether `a` and `b` are within `tolerance` of each other on both axes. */
export function isNearPoint(a: AreaPoint, b: AreaPoint, tolerance: number): boolean {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function distanceToSegment(point: AreaPoint, start: AreaPoint, end: AreaPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / length, 0, 1);
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function round(values: number[]): number[] {
  return values.map(value => Math.round(value));
}
