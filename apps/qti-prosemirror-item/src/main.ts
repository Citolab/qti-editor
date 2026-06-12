/**
 * Minimal QTI ProseMirror editor app.
 *
 * Left: a hardcoded list of Kennisnet sample items. Click one to import it into
 * a ProseMirror editor (center) with a live attributes panel (right). The
 * "Export QTI" button serializes the document back to QTI 3.0.
 */

import { importQTI, exportQTI, mountEditor } from './qti-roundtrip.js';

import type { EditorView } from 'prosemirror-view';

interface SampleItem {
  /** Filename under public/qti/kennisnet (without extension). */
  id: string;
  title: string;
  kind: string;
}

// Hardcoded: the Kennisnet items that use the supported interactions.
const ITEMS: SampleItem[] = [
  { id: 'ITEM001', title: 'Meerkeuzevraag één antwoord', kind: 'choice' },
  { id: 'ITEM002', title: 'Meerkeuzevraag meerdere antwoorden', kind: 'choice' },
  { id: 'ITEM003', title: 'Tekstvraag – hoofdletterongevoelig', kind: 'text-entry' },
  { id: 'ITEM004', title: 'Tekstvraag – exacte match', kind: 'text-entry' },
  { id: 'ITEM005', title: 'Open tekstvraag', kind: 'extended-text' }
];

const app = document.querySelector<HTMLElement>('#app')!;

app.innerHTML = `
  <nav id="item-list" aria-label="QTI items"></nav>
  <section id="editor-pane">
    <div id="editor-toolbar">
      <span id="editor-title">Select an item to start editing.</span>
      <button id="export-btn" type="button" disabled>Export QTI</button>
    </div>
    <div id="editor-host"></div>
    <pre id="export-output" hidden></pre>
  </section>
  <aside id="attributes-panel" aria-label="Attributes"></aside>
`;

const listEl = app.querySelector<HTMLElement>('#item-list')!;
const titleEl = app.querySelector<HTMLElement>('#editor-title')!;
const hostEl = app.querySelector<HTMLElement>('#editor-host')!;
const panelEl = app.querySelector<HTMLElement>('#attributes-panel')!;
const exportBtn = app.querySelector<HTMLButtonElement>('#export-btn')!;
const outputEl = app.querySelector<HTMLPreElement>('#export-output')!;

let view: EditorView | null = null;

async function openItem(item: SampleItem, button: HTMLButtonElement): Promise<void> {
  listEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', 'false'));
  button.setAttribute('aria-current', 'true');

  outputEl.hidden = true;
  outputEl.textContent = '';
  panelEl.innerHTML = '';
  view?.destroy();
  hostEl.innerHTML = '';

  const response = await fetch(`/qti/kennisnet/${item.id}.xml`);
  const xml = await response.text();
  const doc = importQTI(xml);

  view = mountEditor(hostEl, doc, panelEl);
  titleEl.textContent = `${item.id} — ${item.title}`;
  exportBtn.disabled = false;
}

for (const item of ITEMS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-current', 'false');
  button.innerHTML = `<strong>${item.id}</strong><span>${item.title}</span><em>${item.kind}</em>`;
  button.addEventListener('click', () => void openItem(item, button));
  listEl.appendChild(button);
}

exportBtn.addEventListener('click', () => {
  if (!view) return;
  outputEl.textContent = exportQTI(view.state.doc);
  outputEl.hidden = false;
});
