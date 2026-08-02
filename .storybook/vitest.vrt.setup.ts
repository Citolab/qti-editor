import { expect } from 'vitest';
import { commands, page, server } from 'vitest/browser';
import { setProjectAnnotations } from '@storybook/web-components-vite';

import * as previewAnnotations from './preview';

/**
 * Visual-regression (VRT) capture project — the editor's half of the pair.
 *
 * A port of QTI-Components' `.storybook/vitest.vrt.setup.ts`, deliberately kept close to it: the
 * point of having VRT on both sides is that the same 17 ITEM fixtures can be put side by side, and
 * that only works if the two suites capture the same way. Same channel threshold, same allowed
 * mismatch ratio, same stability waits.
 *
 * What differs, and why:
 *
 *   CAPTURE_TARGET   `.regression-item` rather than `qti-item-body`. The runtime renders an item;
 *                    the editor renders an item inside a ProseMirror document, with a debug panel
 *                    beside it. `.regression-item` is the editor container alone — the part that
 *                    has a counterpart in the other repo. Capturing the layout would put the panel
 *                    in every baseline and make the two incomparable.
 *
 *   SCREENSHOT_DIR   `__vrt__`, not `__screenshots__`. Vitest writes FAILURE screenshots to
 *                    `__screenshots__` (screenshotFailures, on by default), and this repo had 40 of
 *                    them sitting in that directory — including screenshots of file-snapshot tests,
 *                    which are meaningless as images. Mixing derived failure artifacts with
 *                    committed baselines in one directory is what made it impossible to tell, at a
 *                    glance, whether this repo had VRT at all. It did not. Two directories, two
 *                    lifetimes: `__screenshots__` stays gitignored, `__vrt__` is tracked.
 *
 * Screenshots are named by Storybook story id, so one story is one baseline. To capture a second
 * state — a gap with a chip in it, a drop mid-drag — add a story whose `play` leaves the editor in
 * that state; the capture runs after `play`, so its end state is what lands on disk. That needs no
 * change here, and each state gets its own file, so a failure names the state that broke.
 */

const CAPTURE_TARGET = '.regression-item';
const SCREENSHOT_DIR = 'apps/e2e/stories/__vrt__';
const PIXEL_CHANNEL_THRESHOLD = 51; // roughly pixelmatch threshold 0.2 on an 8-bit channel
// The fraction of pixels allowed to differ (above the channel threshold) before a capture fails.
// Same 0.0005 as the runtime suite, and for the same reason recorded there: it absorbs sub-pixel
// antialiasing drift while still failing on a single repainted small element.
const ALLOWED_MISMATCHED_PIXEL_RATIO = 0.0005;

const sanitizeStoryId = (id: string) => id.replace(/[^a-z0-9]+/gi, '-');

const screenshotPathFor = (id: string) =>
  `${server.config.root}/${SCREENSHOT_DIR}/${sanitizeStoryId(id)}-${server.browser}-${server.platform}.png`;

const pngSizeFromBase64 = (base64: string) => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const canUpdateSnapshot = (exists: boolean) => {
  const updateState = server.config.snapshotOptions.updateSnapshot;
  return updateState === 'all' || (updateState === 'new' && !exists);
};

const imageDataFromBase64 = async (base64: string) => {
  const img = new Image();
  img.src = `data:image/png;base64,${base64}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas context for VRT image comparison.');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

const countMismatchedPixels = (actual: ImageData, expected: ImageData) => {
  let mismatched = 0;
  for (let index = 0; index < actual.data.length; index += 4) {
    const red = Math.abs(actual.data[index] - expected.data[index]);
    const green = Math.abs(actual.data[index + 1] - expected.data[index + 1]);
    const blue = Math.abs(actual.data[index + 2] - expected.data[index + 2]);
    const alpha = Math.abs(actual.data[index + 3] - expected.data[index + 3]);
    if (Math.max(red, green, blue, alpha) > PIXEL_CHANNEL_THRESHOLD) mismatched += 1;
  }
  return mismatched;
};

/**
 * Zero out animations/transitions so captures are stable.
 *
 * `caret-color: transparent` matters more here than in the runtime suite: every regression story
 * mounts a ProseMirror editor, and a focused editor blinks a caret. Left alone that is a handful of
 * pixels flipping between any two runs of the same unchanged code.
 */
const stabilizeStyles = (doc: Document) => {
  if (doc.querySelector('style[data-vrt-stabilize]')) return;
  const style = doc.createElement('style');
  style.setAttribute('data-vrt-stabilize', '');
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }
    .ProseMirror-focused { outline: none !important; }
  `;
  doc.head.appendChild(style);
};

const waitForStylesheets = async (doc: Document) => {
  const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  await Promise.all(
    links.map(
      link =>
        new Promise<void>(res => {
          if (link.sheet) {
            res();
            return;
          }
          link.addEventListener('load', () => res(), { once: true });
          link.addEventListener('error', () => res(), { once: true });
        })
    )
  );
};

/**
 * Collect every <img> reachable from `node`, piercing shadow roots.
 * `querySelectorAll('img')` is light-DOM only, and the interactions render their images inside
 * shadow trees, so a plain query misses them and the capture fires before they paint.
 */
const findAllImages = (node: ParentNode): HTMLImageElement[] => {
  const imgs: HTMLImageElement[] = Array.from(node.querySelectorAll('img'));
  for (const el of Array.from(node.querySelectorAll('*'))) {
    if ((el as Element).shadowRoot) imgs.push(...findAllImages((el as Element).shadowRoot!));
  }
  return imgs;
};

/** Wait for styles, fonts, and every image inside the story root to settle before capturing. */
const waitForRenderStable = async (root: ParentNode) => {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (doc) await waitForStylesheets(doc);
  if (doc?.fonts?.ready) await doc.fonts.ready;

  const imgs = findAllImages(root);
  await Promise.all(
    imgs.map(async img => {
      if (!img.complete) {
        await new Promise<void>(res => {
          img.addEventListener('load', () => res(), { once: true });
          img.addEventListener('error', () => res(), { once: true });
        });
      }
      // Loaded is not painted: a still-decoding image keeps repainting and defeats the stability
      // loop below.
      try {
        await img.decode();
      } catch {
        /* broken/404 images reject decode(); nothing to wait for */
      }
    })
  );

  // A setTimeout(0) creates a new task, so every microtask chain — including multi-step Lit update
  // cycles and ProseMirror's own post-mount view updates — completes before this resolves. Three
  // rAF frames then give the browser time to paint.
  await new Promise<void>(res => setTimeout(res, 0));
  await new Promise<void>(res =>
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => res())))
  );
};

/**
 * Compose rather than replace.
 *
 * `globalProjectAnnotations` is the whole annotation object the addon drives the story lifecycle
 * from — it calls `.beforeAll()` on it unconditionally. Assigning an object with only an `afterEach`
 * therefore fails every story with "globalProjectAnnotations.beforeAll is not a function" before a
 * single pixel is captured. So take what `setProjectAnnotations` returns, keep all of it, and chain
 * the capture behind whatever afterEach the preview already had.
 */
const existingAnnotations = setProjectAnnotations(previewAnnotations as any);
const existingAfterEach = existingAnnotations.afterEach;

const captureAfterEach = {
  async afterEach(context: { id: string; canvasElement: HTMLElement }) {
    const root = context.canvasElement ?? document.getElementById('storybook-root') ?? document.body;
    const target =
      ((root as HTMLElement).matches?.(CAPTURE_TARGET)
        ? (root as HTMLElement)
        : (root.querySelector(CAPTURE_TARGET) as HTMLElement)) ?? (root as HTMLElement);

    stabilizeStyles(target.ownerDocument);
    await waitForRenderStable(root);

    const locator = page.elementLocator(target);
    const screenshot = await locator.screenshot({ base64: true, save: false });
    const actual = typeof screenshot === 'string' ? screenshot : screenshot.base64;
    const path = screenshotPathFor(context.id);
    let expected: string | undefined;
    try {
      expected = await commands.readFile(path, 'base64');
    } catch {
      expected = undefined;
    }

    if (canUpdateSnapshot(Boolean(expected))) {
      await commands.writeFile(path, actual, 'base64');
      return;
    }

    if (!expected) {
      throw new Error(`Missing VRT screenshot: ${path}. Run "just screenshots" to create it.`);
    }

    const actualSize = pngSizeFromBase64(actual);
    const expectedSize = pngSizeFromBase64(expected);
    expect(actualSize).toEqual(expectedSize);

    const actualData = await imageDataFromBase64(actual);
    const expectedData = await imageDataFromBase64(expected);
    const mismatchedPixels = countMismatchedPixels(actualData, expectedData);
    const mismatchedPixelRatio = mismatchedPixels / (actualSize.width * actualSize.height);
    expect(
      mismatchedPixelRatio,
      `VRT screenshot mismatch for ${context.id}: ${mismatchedPixels} pixels (${(mismatchedPixelRatio * 100).toFixed(
        3
      )}%) differed above channel threshold ${PIXEL_CHANNEL_THRESHOLD}.`
    ).toBeLessThanOrEqual(ALLOWED_MISMATCHED_PIXEL_RATIO);
  }
};

(globalThis as any).globalProjectAnnotations = {
  ...existingAnnotations,
  async afterEach(context: { id: string; canvasElement: HTMLElement }) {
    if (typeof existingAfterEach === 'function') {
      await existingAfterEach(context as any);
    }
    await captureAfterEach.afterEach(context);
  }
};
