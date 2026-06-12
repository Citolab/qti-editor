/**
 * Minimal QTI ProseMirror editor app — composition root.
 *
 * Left: a list of Kennisnet sample items (a native `<select>`), built by reading
 * `AssessmentTest.xml` with `qtiTransformTest` and extracting its
 * `<qti-assessment-item-ref>`s. Choose one to import it into a ProseMirror
 * editor (center) with a live attributes panel (an `<aside>` the editor plugin
 * renders into, right). The "Export QTI" button serializes the document back to
 * QTI 3.0 and logs it to the console.
 *
 * The QTI ↔ ProseMirror roundtrip lives in `@qti-editor/qti-item-roundtrip`;
 * `importItemFromUrl` / `exportItemXml` are bound to the app's editor
 * `schema` here. `importItemFromUrl` fetches the XML and resolves relative asset
 * paths against the source URL automatically. To splice in app-specific
 * conversions, pass `options.transforms` to the import helper or post-process
 * the exported XML string.
 *
 * Supported interactions: choice, extended-text, text-entry (+ rubric block).
 */

import { exportItemXml, importItemFromUrl } from '@qti-editor/qti-item-roundtrip';

import { qtiTransformTest } from '@qti-components/transformers';

import { mountEditor } from './editor/editor.js';
import { schema } from './editor/schema.js';

import type { EditorView } from 'prosemirror-view';

const TEST_BASE = '/qti/kennisnet';

const app = document.querySelector<HTMLElement>('#app')!;

app.innerHTML = `
  <select id="item-list" size="10" aria-label="QTI items"></select>
  <section id="editor-pane">
    <div id="editor-toolbar">
      <span id="editor-title">Select an item to start editing.</span>
      <button id="export-btn" type="button" disabled>Export QTI</button>
    </div>
    <div id="editor-host"></div>
  </section>
  <aside id="attributes-panel" aria-label="Attributes"></aside>
`;

const itemList = app.querySelector<HTMLSelectElement>('#item-list')!;
const editorTitle = app.querySelector<HTMLElement>('#editor-title')!;
const editorHost = app.querySelector<HTMLElement>('#editor-host')!;
const exportBtn = app.querySelector<HTMLButtonElement>('#export-btn')!;
// The attributes fields are rendered by the editor's `attributesPanelPlugin`,
// which just needs a stable host element to draw into; we clear it per item.
const attributesPanel = app.querySelector<HTMLElement>('#attributes-panel')!;

let view: EditorView | null = null;

exportBtn.addEventListener('click', () => {
  if (!view) return;
  const xml = exportItemXml(view.state.doc, schema);
  console.dirxml(new DOMParser().parseFromString(xml, 'application/xml').documentElement);
});

const test = await qtiTransformTest().load(`${TEST_BASE}/AssessmentTest.xml`);
const items = test.items();

itemList.innerHTML = items
  .map(item => `<option value="${item.href}">${item.identifier}</option>`)
  .join('');

itemList.addEventListener('change', () => {
  if (itemList.value) void openItem(itemList.value);
});

async function openItem(href: string): Promise<void> {
  attributesPanel.innerHTML = '';

  const doc = await importItemFromUrl(href, schema);

  view?.destroy();
  editorHost.innerHTML = '';
  view = mountEditor(editorHost, doc, attributesPanel);
  editorTitle.textContent = href;
  exportBtn.disabled = false;
}

