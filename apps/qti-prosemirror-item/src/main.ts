/**
 * Minimal QTI ProseMirror editor app — composition root.
 *
 * Left: a list of Kennisnet sample items (ItemSelector). Click one to import it
 * into a ProseMirror editor (EditorPane, center) with a live attributes panel
 * (AttributesPanel, right). The "Export QTI" button serializes the document
 * back to QTI 3.0 and logs it to the console.
 */

import { ITEMS, type SampleItem } from './data/items.js';
import { ItemSelector } from './components/item-selector.js';
import { EditorPane } from './components/editor-pane.js';
import { AttributesPanel } from './components/attributes-panel.js';
import { importQTI, exportQTI } from './services/qti-service.js';

const app = document.querySelector<HTMLElement>('#app')!;

app.innerHTML = `
  <nav id="item-list" aria-label="QTI items"></nav>
  <section id="editor-pane"></section>
  <aside id="attributes-panel" aria-label="Attributes"></aside>
`;

const attributesPanel = new AttributesPanel(app.querySelector<HTMLElement>('#attributes-panel')!);

const editorPane = new EditorPane(app.querySelector<HTMLElement>('#editor-pane')!, {
  onExport(doc) {
    const xml = exportQTI(doc);
    console.dirxml(new DOMParser().parseFromString(xml, 'application/xml').documentElement);
  }
});

const selector = new ItemSelector(app.querySelector<HTMLElement>('#item-list')!, {
  items: ITEMS,
  onSelect: item => void openItem(item)
});

async function openItem(item: SampleItem): Promise<void> {
  selector.setActive(item);
  attributesPanel.clear();

  const response = await fetch(`/qti/kennisnet/${item.id}.xml`);
  const xml = await response.text();
  const doc = importQTI(xml);

  editorPane.open(doc, attributesPanel.host, `${item.id} — ${item.title}`);
}
