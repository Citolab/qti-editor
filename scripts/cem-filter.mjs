/**
 * Reduce the @pwrs/cem output to the QTI elements of `@citolab/prose-qti` and their attributes.
 *
 * Members, methods, css parts/properties/states, slots, events, exports, superclass links and
 * non-element declarations are all dropped: what survives is a tag name, its description, and
 * the attributes it accepts. That is the whole contract this manifest is for.
 *
 * Only `qti-`-prefixed tags are kept. The editor defines elements of its own that have no QTI
 * counterpart and never reach exported item XML — `dummy-drag` is one — and the prefix is the
 * line between the two. Naming such an element without the prefix keeps it out of this file by
 * construction; every drop is logged, so the filter can never quietly swallow a real element
 * that was misnamed.
 *
 * Everything else here comes out of the JSDoc on the element classes — `@customElement` for the
 * tag, `@attr` for each attribute. cem cannot infer either from these sources (see
 * .config/cem.yaml), so an element or attribute missing from the output is missing from the
 * JSDoc, not filtered out here. The warnings at the end point at exactly that.
 *
 * Usage: node scripts/cem-filter.mjs <raw.json> <out.json>
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

/** Tags without this prefix are editor-only and stay out of the published element contract. */
const QTI_TAG = /^qti-/;

/** A type consisting only of quoted string literals joined by `|`, e.g. `'a'|'b'`. */
const STRING_UNION = /^\s*'[^']*'\s*(\|\s*'[^']*'\s*)+$/;

/**
 * A description opening with `Required.` marks the attribute required. The marker is lifted into
 * a `required` flag and stripped from the prose, so the description stays a description.
 */
const REQUIRED_MARKER = /^Required\.\s*/;

/** Collapse JSDoc hard wraps so descriptions survive as single readable sentences. */
const unwrap = text => text.replace(/\s*\n\s*/g, ' ').trim();

function toAttribute(attribute) {
  const typeText = attribute.type?.text;
  const raw = attribute.description ? unwrap(attribute.description) : '';
  const required = REQUIRED_MARKER.test(raw);
  const description = raw.replace(REQUIRED_MARKER, '');

  return {
    name: attribute.name,
    ...(required ? { required: true } : {}),
    ...(typeText ? { type: typeText } : {}),
    // A closed vocabulary is far more useful to a consumer than the raw union text.
    ...(typeText && STRING_UNION.test(typeText)
      ? { values: typeText.split('|').map(value => value.trim().replace(/^'|'$/g, '')) }
      : {}),
    ...(attribute.default !== undefined ? { default: attribute.default } : {}),
    ...(description ? { description } : {}),
  };
}

const [, , rawPath, outPath] = process.argv;

if (!rawPath || !outPath) {
  console.error('usage: cem-filter.mjs <raw.json> <out.json>');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(rawPath, 'utf8'));

const elements = [];
const untagged = [];
const editorOnly = [];
const seen = new Set();

for (const module of raw.modules ?? []) {
  for (const declaration of module.declarations ?? []) {
    if (declaration.kind !== 'class') continue;

    if (!declaration.tagName) {
      // Base classes and mixin targets legitimately have no tag; only a class that reaches
      // customElements.define() without a @customElement JSDoc tag is a mistake, and this
      // script cannot tell the two apart. Report and let the reader judge.
      untagged.push(`${declaration.name} (${module.path})`);
      continue;
    }

    // One module can be reached by more than one glob; keep the first hit.
    if (seen.has(declaration.tagName)) continue;
    seen.add(declaration.tagName);

    if (!QTI_TAG.test(declaration.tagName)) {
      editorOnly.push(declaration.tagName);
      continue;
    }

    elements.push({
      tagName: declaration.tagName,
      ...(declaration.description ? { description: unwrap(declaration.description) } : {}),
      module: module.path,
      attributes: (declaration.attributes ?? []).map(toAttribute),
    });
  }
}

elements.sort((a, b) => a.tagName.localeCompare(b.tagName));

writeFileSync(outPath, `${JSON.stringify({ schemaVersion: raw.schemaVersion, elements }, null, 2)}\n`);
rmSync(rawPath, { force: true });

const attributeCount = elements.reduce((total, element) => total + element.attributes.length, 0);
console.log(`Wrote ${outPath}: ${elements.length} elements, ${attributeCount} attributes.`);

if (editorOnly.length > 0) {
  console.log(
    `Excluded ${editorOnly.length} editor-only element(s) — no qti- prefix, so not part of the ` +
      `QTI element contract: ${editorOnly.sort().join(', ')}`,
  );
}

const withoutAttributes = elements.filter(element => element.attributes.length === 0);

if (withoutAttributes.length > 0) {
  console.warn(
    `\nWarning: ${withoutAttributes.length} element(s) expose no attributes. If that is wrong, the\n` +
      `class is missing its @attr JSDoc — cem cannot read Lit @property decorators here:\n` +
      withoutAttributes.map(element => `  ${element.tagName}`).join('\n'),
  );
}

if (untagged.length > 0) {
  console.warn(
    `\nNote: ${untagged.length} class(es) have no @customElement JSDoc tag and are absent from the\n` +
      `manifest. Expected for base classes and mixin targets; a mistake for anything that reaches\n` +
      `customElements.define():\n` +
      untagged.map(entry => `  ${entry}`).join('\n'),
  );
}
