/**
 * Mounts a QTI item in an isolated iframe with the runtime
 * `@citolab/qti-components` custom elements loaded.
 *
 * Why an iframe: `customElements.define` is window-scoped. The editor's tests
 * already register editor-side wrappers for `qti-choice-interaction` etc. in
 * the parent window — re-registering the runtime versions there would throw
 * "this name has already been used." An iframe has its own `contentWindow`
 * with an independent `customElements` registry.
 *
 * Runtime files are served at `/qti-runtime/{index.js,item.css}` — vendored
 * from `@citolab/qti-components/dist` into `public/qti-runtime/` by
 * `scripts/vendor-qti-runtime.mjs` (runs as vitest globalSetup before tests).
 */

import { page, userEvent } from 'vitest/browser';

import type { FrameLocator } from 'vitest/browser';

export interface RuntimeHarness {
  iframe: HTMLIFrameElement;
  assessmentItem: HTMLElement;
  doc: Document;
  win: Window;
  /**
   * Locator scoped to the runtime iframe. Use this for ALL interaction — it
   * dispatches trusted CDP events, unlike `element.click()` / `dispatchEvent`.
   * See "Testing Architecture" in AGENTS.md.
   */
  frame: FrameLocator;
  /** Runs response processing and returns the SCORE outcome as a number. */
  score(): number;
  /** The currently staged value of a response variable. */
  response(identifier?: string): unknown;
  destroy(): void;
}

/** Runtime API surface we drive; the components are untyped from here. */
interface AssessmentItemApi extends HTMLElement {
  processResponse(): void;
  getOutcome(identifier: string): { value: unknown };
  getResponse?(identifier: string): { value: unknown } | undefined;
  updateResponseVariable(identifier: string, value: unknown): void;
}

const TIMEOUT_MS = 5000;

/** Distinguishes concurrently mounted harnesses for `frameLocator`. */
let harnessSeq = 0;

/**
 * Places a draggable onto a drop target using the component's KEYBOARD
 * placement protocol — real trusted key events, no staging.
 *
 * Implemented by `drag-drop-core.mixin.ts` in @citolab/qti-components:
 *   focus a draggable, `Space` grabs it (drop index 0), `ArrowRight` advances
 *   the drop target, `Space` drops and saves the response.
 *
 * This is the accessible path, and the only drag path Playwright can drive —
 * pointer dragging hangs on its actionability check (finding #14).
 *
 * @param label      visible text of the chip to place
 * @param slotIndex  zero-based index into the interaction's drop targets
 */
export async function placeByKeyboard(
  harness: RuntimeHarness,
  label: string,
  slotIndex: number,
): Promise<void> {
  await harness.frame.getByText(label, { exact: true }).first().click(); // focus the chip
  await userEvent.keyboard('{Space}'); // grab
  for (let i = 0; i < slotIndex; i++) {
    await userEvent.keyboard('{ArrowRight}');
  }
  await userEvent.keyboard('{Space}'); // drop + saveResponse()
}

/**
 * Stages a response value directly, bypassing the UI.
 *
 * PREFER REAL INTERACTION. Use this ONLY for the drag-based interactions
 * (order, match, gap-match, associate), which cannot currently be driven by
 * Playwright — see finding #14 in docs/testing-findings.md. Every other
 * interaction type must be exercised through `harness.frame` locators so the
 * gesture itself is covered.
 *
 * Tests using this helper verify SCORING, not the drag gesture: a regression
 * that broke dragging entirely would still leave them green.
 */
export function stageResponse(
  harness: Pick<RuntimeHarness, 'assessmentItem'>,
  value: unknown,
  identifier = 'RESPONSE',
): void {
  (harness.assessmentItem as AssessmentItemApi).updateResponseVariable(identifier, value);
}

/**
 * Rewrites `<qti-foo ... />` to `<qti-foo ...></qti-foo>`.
 *
 * The item is injected into an HTML `srcdoc`, and HTML has no self-closing
 * syntax for non-void elements: the parser treats `<qti-x/>` as an OPEN tag and
 * nests every following sibling inside it. The editor legitimately self-closes
 * empty elements in its XML output, so without this the runtime receives a
 * different tree than the XML describes — e.g. ITEM005's sibling
 * `qti-rubric-block[view=scorer]` became a CHILD of the interaction, and the
 * runtime hid the interaction along with the scorer-only rubric.
 *
 * Only hyphenated (custom) elements are rewritten; real void elements such as
 * `<img/>` and `<br/>` must keep their self-closing form.
 */
function expandSelfClosingCustomElements(xml: string): string {
  return xml.replace(
    /<([a-z][a-z0-9]*-[a-z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)\/>/gi,
    '<$1$2></$1>',
  );
}

export async function mountQtiRuntime(itemXml: string): Promise<RuntimeHarness> {
  const body = expandSelfClosingCustomElements(itemXml.replace(/^<\?xml[^?]*\?>\s*/i, ''));

  const testId = `qti-runtime-${++harnessSeq}`;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-testid', testId);
  iframe.style.border = '0';
  iframe.style.width = '800px';
  iframe.style.height = '600px';
  document.body.appendChild(iframe);

  // Resolve runtime URLs against the parent's origin — relative URLs in a
  // srcdoc iframe don't resolve to /qti-runtime/ reliably.
  const origin = window.location.origin;
  const srcdoc = `<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="${origin}/qti-runtime/item.css">
    <script type="module">
      import * as QTI from '${origin}/qti-runtime/index.js';
      window.__QTI_READY__ = true;
    </script>
  </head>
  <body>${body}</body>
</html>`;

  iframe.srcdoc = srcdoc;

  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      iframe.removeEventListener('load', onLoad);
      resolve();
    };
    iframe.addEventListener('load', onLoad);
    setTimeout(() => reject(new Error('iframe load timeout')), TIMEOUT_MS);
  });

  const win = iframe.contentWindow as Window & { __QTI_READY__?: boolean };
  const doc = iframe.contentDocument!;
  if (!win || !doc) throw new Error('iframe lost contentWindow/contentDocument');

  // The runtime is loaded via <script type="module"> which is async even after
  // the iframe 'load' event fires. Wait for the inline module to set the flag.
  const start = Date.now();
  while (!win.__QTI_READY__) {
    if (Date.now() - start > TIMEOUT_MS) throw new Error('qti-runtime did not signal __QTI_READY__');
    await new Promise(r => setTimeout(r, 25));
  }

  await win.customElements.whenDefined('qti-assessment-item');

  const assessmentItem = doc.querySelector('qti-assessment-item') as HTMLElement | null;
  if (!assessmentItem) throw new Error('no <qti-assessment-item> found in iframe body');

  // Microtask for Lit's first render.
  await Promise.resolve();

  const api = assessmentItem as AssessmentItemApi;

  return {
    iframe,
    assessmentItem,
    doc,
    win,
    frame: page.frameLocator(page.getByTestId(testId)),
    score() {
      api.processResponse();
      return Number(api.getOutcome('SCORE').value);
    },
    response(identifier = 'RESPONSE') {
      return api.getResponse?.(identifier)?.value ?? null;
    },
    destroy() {
      iframe.remove();
    },
  };
}
