/**
 * Reading a picture's pixels, for the magic wand (`magic-wand.ts`). Its own module, so an editor
 * that loads the wand lazily loads this with it.
 */

/** RGBA pixels, as `ImageData` holds them. */
export interface ImagePixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Longest side a picture is read at for the magic wand: enough for an outline, quick to flood. */
export const PIXELS_MAX_SIDE = 1000;

/**
 * The RGBA pixels of the picture at `src`, at its natural size scaled down to at most
 * {@link PIXELS_MAX_SIDE} on its longest side. That is rarely the coordinate space its areas are
 * measured in (the picture's `width` / `height`); `MagicWand` maps between the two.
 *
 * `null` — never a throw — when they cannot be read: the picture does not load, or it comes from
 * another origin that does not allow it (CORS), which would leave the canvas tainted.
 *
 * The picture is requested with `crossOrigin = 'anonymous'`, which sends no cookies. A picture from
 * another origin that is only served to a logged-in session (an asset host behind cookie
 * authentication) therefore fails to load here even though the editor shows it, and the wand says
 * it cannot read it. A data URL or a same-origin picture always works.
 */
export async function readImagePixels(src: string): Promise<ImagePixels | null> {
  const img = new Image();
  // Asked for with CORS, so a picture from another origin that allows it can be read; one that does
  // not fails to load here (it still shows in the editor, which loads it without CORS).
  img.crossOrigin = 'anonymous';
  img.src = src;
  try {
    await img.decode();
  } catch {
    return null;
  }
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const scale = Math.min(1, PIXELS_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  try {
    context.drawImage(img, 0, 0, width, height);
    return { width, height, data: context.getImageData(0, 0, width, height).data };
  } catch {
    // A tainted canvas throws a SecurityError on getImageData.
    return null;
  }
}
