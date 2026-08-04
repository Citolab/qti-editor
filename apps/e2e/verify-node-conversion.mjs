/**
 * What a real consumer writes. No DOM shim, no globals, no setup — one import.
 *
 * Still needs the resolve hook, and that is not this package's fault: `@qti-components/*` dists ship
 * extensionless relative imports because they compile with `moduleResolution: bundler`. Fixing that
 * emit is the only honest way to remove the hook.
 */
import { readdirSync, readFileSync } from 'node:fs';

import { qti3ToPm, pmToQti3, htmlToPm, pmToHtml, validateHtml, createQtiSchema } from '@citolab/prose-qti-node';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const ITEMS = readdirSync(new URL('./stories/fixtures/', import.meta.url))
  .filter(name => /^ITEM\d+\.xml$/.test(name))
  .map(name => name.replace(/\.xml$/, ''))
  .sort();

const canonical = xml => {
  const doc = new DOMParser().parseFromString(xml.replace(/^<\?xml[^?]*\?>\s*/, ''), 'text/xml');
  const walk = node => {
    if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (node.nodeType !== 1) return '';
    const attrs = Array.from(node.attributes ?? [])
      .filter(a => a.name !== 'xmlns:xsi')
      .map(a => `${a.name}=${JSON.stringify(a.value)}`)
      .sort()
      .join(' ');
    return `<${node.localName}${attrs ? ' ' + attrs : ''}>${Array.from(node.childNodes)
      .map(walk)
      .filter(Boolean)
      .join('')}</${node.localName}>`;
  };
  return doc.documentElement ? walk(doc.documentElement) : '';
};

console.log(`createQtiSchema(): ${Object.keys(createQtiSchema().nodes).length} nodes\n`);

let roundtrip = 0;
for (const item of ITEMS) {
  const doc = qti3ToPm(read(`./stories/fixtures/${item}.xml`), { assetBasePath: '/qti/kennisnet' });
  if (canonical(pmToQti3(doc)) === canonical(read(`./stories/__file_snapshots__/${item}-editor.xml`))) roundtrip++;
}
console.log(`qti3ToPm -> pmToQti3 vs committed snapshots : ${roundtrip}/${ITEMS.length}`);

// The generator loop: write HTML, find out what the schema kept.
console.log('\n--- validateHtml, as a generator would use it ---');
const cases = [
  ['a paragraph', '<p>Water boils at 100 degrees.</p>'],
  ['a table in a prompt', '<qti-prompt><table><tbody><tr><td>nope</td></tr></tbody></table></qti-prompt>'],
  ['a list', '<ul><li><p>one</p></li><li><p>two</p></li></ul>'],
  ['layout wrappers', '<div class="qti-layout-row"><div class="qti-layout-col6"><p>left</p></div></div>']
];
for (const [label, html] of cases) {
  const r = validateHtml(html, { identifier: 'X', title: 'X' });
  console.log(`  ${label}: valid=${r.valid}${r.suspect ? ' (suspect)' : ''}`);
  for (const c of r.changes) console.log(`      ${c.kind.padEnd(7)} ${c.detail}`);
}

console.log('\n--- htmlToPm / pmToHtml are reachable ---');
const pm = htmlToPm('<p>hello</p>', { identifier: 'X', title: 'X' });
console.log(`  htmlToPm -> ${pm.childCount} top-level node(s); pmToHtml -> ${JSON.stringify(pmToHtml(pm))}`);
