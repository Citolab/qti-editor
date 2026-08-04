/**
 * Re-run of the NODE-CONVERSION spike, on the current corpus.
 *
 * Reproduces the three rows of the "What was measured" table plus the identity-failure
 * characterisation. Same surface a consumer gets: `@citolab/prose-qti/node`, no browser.
 */
import { readdirSync, readFileSync } from 'node:fs';

import { qti3ToPm, pmToQti3, pmToHtml, htmlToPm, createQtiSchema } from '@citolab/prose-qti/node';

const FIXTURES = new URL('./stories/fixtures/', import.meta.url);
const SNAPSHOTS = new URL('./stories/__file_snapshots__/', import.meta.url);

const ITEMS = readdirSync(FIXTURES)
  .filter(n => /^ITEM\d+\.xml$/.test(n))
  .map(n => n.replace(/\.xml$/, ''))
  .sort();

const read = (base, name) => readFileSync(new URL(name, base), 'utf8');

/** Structural canonicalisation — same rule verify-node-conversion.mjs uses. */
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

const countNodes = doc => {
  let n = 0;
  doc.descendants(() => {
    n += 1;
    return true;
  });
  return n;
};

const schema = createQtiSchema();
const opts = { schema, assetBasePath: '/qti/kennisnet' };

const rows = { snapshots: 0, pmHtmlPm: 0, pmXmlPm: 0 };
const failures = { pmHtmlPm: [], pmXmlPm: [] };

for (const item of ITEMS) {
  const src = read(FIXTURES, `${item}.xml`);
  const doc = qti3ToPm(src, opts);

  // Row 1 — xml -> (html) -> pm -> qti xml, vs the committed snapshot.
  if (canonical(pmToQti3(doc, { schema })) === canonical(read(SNAPSHOTS, `${item}-editor.xml`))) {
    rows.snapshots += 1;
  }

  // Row 2 — pm -> html -> pm identity.
  const viaHtml = htmlToPm(pmToHtml(doc, { schema }), {
    schema,
    identifier: doc.attrs.identifier,
    title: doc.attrs.title
  });
  if (doc.eq(viaHtml)) rows.pmHtmlPm += 1;
  else failures.pmHtmlPm.push(`${item} ${countNodes(doc)}->${countNodes(viaHtml)}`);

  // Row 3 — pm -> qti xml -> pm identity. NO assetBasePath on the way back: the exported XML
  // already carries rewritten asset URLs, and re-applying the base would prefix them twice.
  const viaXml = qti3ToPm(pmToQti3(doc, { schema }), { schema });
  if (doc.eq(viaXml)) rows.pmXmlPm += 1;
  else failures.pmXmlPm.push(`${item} ${countNodes(doc)}->${countNodes(viaXml)}`);
}

const n = ITEMS.length;
console.log(`corpus: ${n} items (${ITEMS[0]}..${ITEMS[n - 1]})\n`);
console.log(`| xml -> html -> pm -> qti xml, vs committed snapshots | ${rows.snapshots}/${n} |`);
console.log(`| pm -> html -> pm identity                           | ${rows.pmHtmlPm}/${n} |`);
console.log(`| pm -> qti xml -> pm identity                        | ${rows.pmXmlPm}/${n} |`);
console.log(`\nidentity failures (node count before->after):`);
console.log(`  pm->html->pm : ${failures.pmHtmlPm.join(', ') || 'none'}`);
console.log(`  pm->qti->pm  : ${failures.pmXmlPm.join(', ') || 'none'}`);

// ── Counterfactual: the same corpus with `qtiLayoutDiv` removed from the schema ──────────────────
// Re-derives the figure NODE-CONVERSION.md quotes as "with it 17/17, without it 9/17". Nothing
// references qtiLayoutDiv by name (it is a plain `block` with `block+` content), so dropping the
// spec is enough to model "the package never shipped it".
const withoutLayoutDiv = new (Object.getPrototypeOf(schema).constructor)({
  nodes: schema.spec.nodes.remove('qtiLayoutDiv'),
  marks: schema.spec.marks
});

let noLayout = 0;
const noLayoutFails = [];
for (const item of ITEMS) {
  try {
    const doc = qti3ToPm(read(FIXTURES, `${item}.xml`), { schema: withoutLayoutDiv, assetBasePath: '/qti/kennisnet' });
    if (canonical(pmToQti3(doc, { schema: withoutLayoutDiv })) === canonical(read(SNAPSHOTS, `${item}-editor.xml`))) noLayout += 1;
    else noLayoutFails.push(item);
  } catch {
    noLayoutFails.push(`${item}(threw)`);
  }
}
console.log(`\nwithout qtiLayoutDiv, vs committed snapshots : ${noLayout}/${ITEMS.length}`);
console.log(`  failing: ${noLayoutFails.join(', ') || 'none'}`);
console.log(`  (fixtures containing qti-layout-*: ${ITEMS.filter(i => /qti-layout-/.test(read(FIXTURES, `${i}.xml`))).join(', ')})`);
