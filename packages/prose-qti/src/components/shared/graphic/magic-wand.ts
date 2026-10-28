/**
 * Magic wand: the outline of the region around a clicked pixel, as a polygon.
 *
 * Pure — pixels in, points out — so the same click always gives the same polygon, and it runs and
 * is tested without a canvas. The editor supplies the picture's pixels (`readImagePixels` in
 * `image-pixels.ts`). It works best on flat colours (maps, diagrams); a photo gives a ragged region,
 * which the author can then correct with the polygon's handles.
 *
 * The outline is simplified to at most `maxPoints` (60) points, however large or detailed the
 * region. A region with more corners than that — a comb, a coastline — loses detail: the
 * simplification raises its tolerance until the polygon fits, and teeth narrower than that
 * tolerance disappear (a comb can come out as its bounding quadrilateral). The author then adds
 * points by hand, or outlines the parts separately.
 *
 * Ported from qti-construction's `prose-qti-graphic` (`magicWand.ts`, `cardWand.ts`).
 */

import { distanceToSegment, type AreaPoint, type AreaSize } from './area-geometry.js';

import type { ImagePixels } from './image-pixels.js';

export interface WandOptions {
  /** Largest difference per colour channel (0–255) from the clicked colour that still belongs to the region. */
  tolerance?: number;
  /** The polygon gets at most this many points; the outline is simplified until it fits. */
  maxPoints?: number;
  /** A region covering more than this share of the image, or touching all four of its edges, is the background. */
  maxShare?: number;
  /** A region smaller than this many pixels is noise — a line, a letter. */
  minPixels?: number;
}

const DEFAULTS: Required<WandOptions> = { tolerance: 32, maxPoints: 60, maxShare: 0.9, minPixels: 30 };

/** The pixels connected to `seed` (4-neighbours) whose colour is within `tolerance` of the seed's: 1 = in the region. */
export function floodRegion(pixels: ImagePixels, seed: AreaPoint, tolerance = DEFAULTS.tolerance): Uint8Array {
  const { width, height, data } = pixels;
  const mask = new Uint8Array(width * height);
  const sx = Math.floor(seed.x);
  const sy = Math.floor(seed.y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return mask;

  const start = (sy * width + sx) * 4;
  const [r, g, b, a] = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const alike = (index: number) => {
    const p = index * 4;
    return (
      Math.abs(data[p] - r) <= tolerance &&
      Math.abs(data[p + 1] - g) <= tolerance &&
      Math.abs(data[p + 2] - b) <= tolerance &&
      Math.abs(data[p + 3] - a) <= tolerance
    );
  };

  const stack = [sy * width + sx];
  mask[stack[0]] = 1;
  while (stack.length > 0) {
    const index = stack.pop()!;
    for (const next of neighbours(index, width, height)) {
      if (next >= 0 && !mask[next] && alike(next)) {
        mask[next] = 1;
        stack.push(next);
      }
    }
  }
  return mask;
}

// Directions, clockwise on screen (y down): east, south, west, north.
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

/**
 * The outer outline of the region in `mask` (pixel corners, clockwise), or `[]` when the mask is
 * empty. Walks the boundary with the region on its right, preferring the right turn where two
 * corners touch, so holes in the region (a label, a lake) are left out: the polygon is the region's
 * outside.
 */
export function traceOutline(mask: Uint8Array, width: number, height: number): AreaPoint[] {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
  const start = mask.indexOf(1);
  if (start < 0) return [];

  // The first region pixel in reading order: its top edge is on the outer outline, walked eastwards.
  const x0 = start % width;
  const y0 = (start - x0) / width;
  // Whether the boundary edge leaving corner (x, y) in direction d exists: the pixel on its right is
  // in the region, the one on its left is not. Corner (x, y) is the top-left corner of pixel (x, y).
  const edge = (x: number, y: number, d: number) => {
    switch (d) {
      case 0:
        return inside(x, y) && !inside(x, y - 1);
      case 1:
        return inside(x - 1, y) && !inside(x, y);
      case 2:
        return inside(x - 1, y - 1) && !inside(x - 1, y);
      default:
        return inside(x, y - 1) && !inside(x - 1, y - 1);
    }
  };

  const points: AreaPoint[] = [];
  let [x, y, d] = [x0, y0, 0];
  const limit = 4 * (width + 1) * (height + 1);
  for (let steps = 0; steps < limit; steps++) {
    // Right turn first, then straight on, then left.
    const next = [(d + 1) % 4, d, (d + 3) % 4].find(candidate => edge(x, y, candidate));
    if (next === undefined) break;
    if (next !== d || points.length === 0) points.push({ x, y });
    d = next;
    x += DX[d];
    y += DY[d];
    if (x === x0 && y === y0) break;
  }
  return points;
}

/** A closed outline with at most `maxPoints` points: Douglas–Peucker, the tolerance raised until it fits. */
export function simplifyOutline(points: AreaPoint[], maxPoints = DEFAULTS.maxPoints): AreaPoint[] {
  if (points.length <= 3) return points;
  // Split the ring at the point farthest from the first, so both halves are open polylines.
  const distance = (point: AreaPoint) => Math.hypot(point.x - points[0].x, point.y - points[0].y);
  let far = 0;
  for (let index = 1; index < points.length; index++) if (distance(points[index]) > distance(points[far])) far = index;

  const ring = [...points, points[0]];
  for (let epsilon = 1; ; epsilon *= 1.5) {
    const simplified = [
      ...douglasPeucker(ring.slice(0, far + 1), epsilon).slice(0, -1),
      ...douglasPeucker(ring.slice(far), epsilon).slice(0, -1),
    ];
    if (simplified.length <= maxPoints || epsilon > 1e4) return simplified;
  }
}

/** The simplified outer outline of a mask, or `null` when it has none. */
export function outlineOf(mask: Uint8Array, width: number, height: number, maxPoints = DEFAULTS.maxPoints): AreaPoint[] | null {
  const outline = simplifyOutline(traceOutline(mask, width, height), maxPoints);
  return outline.length >= 3 ? outline : null;
}

/**
 * The region at `seed` (in the pixels' own coordinates): its pixels, and the polygon around it —
 * `null` when there is no usable region: a speck, or the background of the whole image. The mask
 * comes back either way, so a hover preview can keep using it while the pointer stays inside.
 */
export function wandRegion(
  pixels: ImagePixels,
  seed: AreaPoint,
  options: WandOptions = {},
): { mask: Uint8Array; polygon: AreaPoint[] | null } {
  const o = { ...DEFAULTS, ...options };
  const mask = floodRegion(pixels, seed, o.tolerance);
  let count = 0;
  for (const value of mask) count += value;
  if (
    count < o.minPixels ||
    count > o.maxShare * pixels.width * pixels.height ||
    touchesAllEdges(mask, pixels.width, pixels.height)
  ) {
    return { mask, polygon: null };
  }
  return { mask, polygon: outlineOf(mask, pixels.width, pixels.height, o.maxPoints) };
}

/** The polygon around the region at `seed`, or `null`; see {@link wandRegion}. */
export function wandPolygon(pixels: ImagePixels, seed: AreaPoint, options: WandOptions = {}): AreaPoint[] | null {
  return wandRegion(pixels, seed, options).polygon;
}

/**
 * One region from two (Shift+click with the wand): their union with the thin gaps between them
 * filled — a border line up to `gap * 2` pixels wide, such as a dike between two lakes — or `null`
 * when they do not touch across such a gap, since an area is one shape. Only the part connected to
 * `a` is kept.
 */
export function mergeRegions(a: Uint8Array, b: Uint8Array, width: number, height: number, gap = 3): Uint8Array | null {
  const union = new Uint8Array(a.length);
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  let seed = -1;
  for (let index = 0; index < union.length; index++) {
    if (!a[index] && !b[index]) continue;
    union[index] = 1;
    if (seed < 0 && a[index]) seed = index;
    const x = index % width;
    const y = (index - x) / width;
    [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
  }
  if (seed < 0) return null;

  // Closing (grow by `gap`, then shrink by `gap`) inside the union's bounding box: fills the gaps
  // and keeps the outer edge. It runs on a copy with a `gap`-wide empty margin round the picture,
  // so a region near the picture's edge is not eaten into by the shrink, which would otherwise see
  // nothing past that edge.
  const paddedWidth = width + 2 * gap;
  const padded = new Uint8Array(paddedWidth * (height + 2 * gap));
  for (let y = 0; y < height; y++) padded.set(union.subarray(y * width, (y + 1) * width), (y + gap) * paddedWidth + gap);
  const box = { x0, y0, x1: x1 + 2 * gap, y1: y1 + 2 * gap };
  const paddedClosed = morph(morph(padded, paddedWidth, box, gap, true), paddedWidth, box, gap, false);
  const closed = new Uint8Array(union.length);
  for (let y = 0; y < height; y++) {
    const from = (y + gap) * paddedWidth + gap;
    closed.set(paddedClosed.subarray(from, from + width), y * width);
  }
  // Keep what is connected to `a`; it must reach `b`.
  const merged = floodMask(closed, width, height, seed);
  for (let index = 0; index < b.length; index++) if (b[index] && merged[index]) return merged;
  return null;
}

/** Why a wand click made nothing. */
export type WandMiss = 'noRegion' | 'notTouching';

/** What a wand click makes: area coords and the region's pixels, or why it makes nothing. */
export type WandPick = { coords: number[]; mask: Uint8Array } | { miss: WandMiss };

/** The area the wand made last, so Shift+click can add to it. */
export interface WandArea {
  identifier: string;
  /** Its coords as the wand wrote them; once they differ, the author has reshaped it and it is not extended. */
  coords: string;
  mask: Uint8Array;
}

/**
 * The wand over one picture: hover previews and clicks, in the picture's coordinate space (the
 * `size` its areas' coords are measured in), over pixels that may be a scaled-down copy.
 *
 * Holds the last region found, so moving the pointer within it does not flood again.
 */
export class MagicWand {
  readonly #pixels: ImagePixels;
  readonly #scale: { x: number; y: number };
  readonly #size: AreaSize;
  /** The region under the pointer: its pixels, and its outline in the pixels' coordinates (`null` when unusable). */
  #hovered: { mask: Uint8Array; polygon: AreaPoint[] | null } | null = null;
  /** The last result, and what it was for: tracing an outline is the slow part, so a preview reuses it. */
  #last: { region: object; extend: WandArea | null; result: WandPick } | null = null;

  constructor(pixels: ImagePixels, size: AreaSize) {
    this.#pixels = pixels;
    this.#size = size;
    this.#scale = { x: size.width / pixels.width, y: size.height / pixels.height };
  }

  /** What a click at `point` makes, optionally added to the area the wand made last. */
  pick(point: AreaPoint, extend: WandArea | null = null): WandPick {
    const region = this.#regionAt(point);
    if (this.#last?.region === region && this.#last.extend === extend) return this.#last.result;
    const result = this.#resultFor(region, extend);
    this.#last = { region, extend, result };
    return result;
  }

  /** The coords {@link pick} would produce, or `null`; for the hover preview. */
  preview(point: AreaPoint, extend: WandArea | null = null): number[] | null {
    const result = this.pick(point, extend);
    return 'coords' in result ? result.coords : null;
  }

  /** Each region is outlined once: by `wandRegion` on its own, or here after a merge. */
  #resultFor(region: { mask: Uint8Array; polygon: AreaPoint[] | null }, extend: WandArea | null): WandPick {
    if (!region.polygon) return { miss: 'noRegion' };
    if (!extend) return { coords: this.#toCoords(region.polygon), mask: region.mask };
    const mask = mergeRegions(extend.mask, region.mask, this.#pixels.width, this.#pixels.height);
    if (!mask) return { miss: 'notTouching' };
    const polygon = outlineOf(mask, this.#pixels.width, this.#pixels.height);
    return polygon ? { coords: this.#toCoords(polygon), mask } : { miss: 'noRegion' };
  }

  #regionAt(point: AreaPoint) {
    const x = Math.min(this.#pixels.width - 1, Math.floor(point.x / this.#scale.x));
    const y = Math.min(this.#pixels.height - 1, Math.floor(point.y / this.#scale.y));
    if (this.#hovered?.mask[y * this.#pixels.width + x]) return this.#hovered;
    this.#hovered = wandRegion(this.#pixels, { x, y });
    return this.#hovered;
  }

  /** A polygon in the pixels' coordinates as `coords` in the picture's. */
  #toCoords(polygon: AreaPoint[]): number[] {
    return polygon.flatMap(({ x, y }) => [
      Math.round(Math.min(this.#size.width, x * this.#scale.x)),
      Math.round(Math.min(this.#size.height, y * this.#scale.y)),
    ]);
  }
}

function neighbours(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = (index - x) / width;
  return [
    x > 0 ? index - 1 : -1,
    x < width - 1 ? index + 1 : -1,
    y > 0 ? index - width : -1,
    y < height - 1 ? index + width : -1,
  ];
}

function douglasPeucker(points: AreaPoint[], epsilon: number): AreaPoint[] {
  if (points.length < 3) return points;
  let [index, max] = [0, 0];
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1]);
    if (distance > max) [index, max] = [i, distance];
  }
  if (max <= epsilon) return [points[0], points[points.length - 1]];
  return [
    ...douglasPeucker(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...douglasPeucker(points.slice(index), epsilon),
  ];
}

/** Grow (a max filter) or shrink (a min filter) a mask by `r` pixels within `box`, horizontally then vertically. */
function morph(
  mask: Uint8Array,
  width: number,
  box: { x0: number; y0: number; x1: number; y1: number },
  r: number,
  grow: boolean,
): Uint8Array {
  const pass = (source: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(source);
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0; x <= box.x1; x++) {
        let hit = !grow;
        for (let d = -r; d <= r && hit !== grow; d++) {
          const nx = horizontal ? x + d : x;
          const ny = horizontal ? y : y + d;
          // Outside the box counts as empty, so shrinking is not stopped by the box edge.
          const value = nx >= box.x0 && nx <= box.x1 && ny >= box.y0 && ny <= box.y1 ? source[ny * width + nx] : 0;
          if (grow && value) hit = true;
          if (!grow && !value) hit = false;
        }
        out[y * width + x] = hit ? 1 : 0;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/** The pixels of `mask` connected (4-neighbours) to `seed`. */
function floodMask(mask: Uint8Array, width: number, height: number, seed: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  if (!mask[seed]) return out;
  out[seed] = 1;
  const stack = [seed];
  while (stack.length > 0) {
    const index = stack.pop()!;
    for (const next of neighbours(index, width, height)) {
      if (next >= 0 && mask[next] && !out[next]) {
        out[next] = 1;
        stack.push(next);
      }
    }
  }
  return out;
}

/** Whether the region reaches every edge of the image: the background round a map, whose outline would be the frame. */
function touchesAllEdges(mask: Uint8Array, width: number, height: number): boolean {
  const row = (y: number) => mask.subarray(y * width, (y + 1) * width).includes(1);
  let [left, right] = [false, false];
  for (let y = 0; y < height && !(left && right); y++) {
    left ||= mask[y * width] === 1;
    right ||= mask[y * width + width - 1] === 1;
  }
  return left && right && row(0) && row(height - 1);
}
