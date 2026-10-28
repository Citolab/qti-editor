import { describe, expect, test } from 'vitest';

import { PIXELS_MAX_SIDE, readImagePixels } from './image-pixels.js';

/** A flat picture, `width` x `height`: blue on its left half, white on its right. */
function halves(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#0000ff';
  context.fillRect(0, 0, width / 2, height);
  return canvas.toDataURL('image/png');
}

const rgbaAt = (pixels: { width: number; data: Uint8ClampedArray }, x: number, y: number) =>
  Array.from(pixels.data.subarray((y * pixels.width + x) * 4, (y * pixels.width + x) * 4 + 4));

describe('readImagePixels', () => {
  test('reads a small picture at its own size', async () => {
    const pixels = await readImagePixels(halves(40, 20));
    expect(pixels).toMatchObject({ width: 40, height: 20 });
    expect(rgbaAt(pixels!, 5, 5)).toEqual([0, 0, 255, 255]);
    expect(rgbaAt(pixels!, 35, 5)).toEqual([255, 255, 255, 255]);
  });

  test('scales a picture over 1000 px down to 1000 on its longest side, keeping its proportions', async () => {
    expect(PIXELS_MAX_SIDE).toBe(1000);
    const pixels = await readImagePixels(halves(2400, 1200));
    expect(pixels).toMatchObject({ width: 1000, height: 500 });
    expect(pixels!.data).toHaveLength(1000 * 500 * 4);
    expect(rgbaAt(pixels!, 100, 250)).toEqual([0, 0, 255, 255]);
    expect(rgbaAt(pixels!, 900, 250)).toEqual([255, 255, 255, 255]);
  });

  test('gives null, without throwing, for a picture that does not load', async () => {
    await expect(readImagePixels('/qti/conformance/does-not-exist.png')).resolves.toBeNull();
  });
});
