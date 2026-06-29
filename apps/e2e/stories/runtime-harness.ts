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

export interface RuntimeHarness {
  iframe: HTMLIFrameElement;
  assessmentItem: HTMLElement;
  doc: Document;
  win: Window;
  destroy(): void;
}

const TIMEOUT_MS = 5000;

export async function mountQtiRuntime(itemXml: string): Promise<RuntimeHarness> {
  const body = itemXml.replace(/^<\?xml[^?]*\?>\s*/i, '');

  const iframe = document.createElement('iframe');
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

  return {
    iframe,
    assessmentItem,
    doc,
    win,
    destroy() {
      iframe.remove();
    },
  };
}
