/**
 * Minimal QTI ProseMirror editor app — composition root.
 *
 * Left: a list of Kennisnet sample items (a native `<select>`), built by reading
 * `AssessmentTest.xml` with `qtiTransformTest` and extracting its
 * `<qti-assessment-item-ref>`s. Choose one to import it into a ProseMirror
 * editor (EditorPane, center) with a live attributes panel (AttributesPanel,
 * right). The "Export QTI" button serializes the document back to QTI 3.0 and
 * logs it to the console.
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

import { EditorPane } from './components/editor-pane.js';
import { AttributesPanel } from './components/attributes-panel.js';
import { schema } from './editor/schema.js';

const TEST_BASE = '/qti/kennisnet';

const app = document.querySelector<HTMLElement>('#app')!;

app.innerHTML = `
  <select id="item-list" size="10" aria-label="QTI items"></select>
  <section id="editor-pane"></section>
  <aside id="attributes-panel" aria-label="Attributes"></aside>
`;

const attributesPanel = new AttributesPanel(app.querySelector<HTMLElement>('#attributes-panel')!);

const editorPane = new EditorPane(app.querySelector<HTMLElement>('#editor-pane')!, {
  onExport(doc) {
    const xml = exportItemXml(doc, schema);
    console.dirxml(new DOMParser().parseFromString(xml, 'application/xml').documentElement);
  }
});

const itemList = app.querySelector<HTMLSelectElement>('#item-list')!;

const test = await qtiTransformTest().load(`${TEST_BASE}/AssessmentTest.xml`);
const items = test.items();

itemList.innerHTML = items
  .map(item => `<option value="${item.href}">${item.identifier}</option>`)
  .join('');

itemList.addEventListener('change', () => {
  if (itemList.value) void openItem(itemList.value);
});

async function openItem(href: string): Promise<void> {
  attributesPanel.clear();

  const doc = await importItemFromUrl(href, schema);

  editorPane.open(doc, attributesPanel.host, href);
}

