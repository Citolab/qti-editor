# Node API

Converting QTI into the editor's document model and back, without a browser.

```sh
npm install @citolab/prose-qti-node
```
```js
import { qti3ToPm, pmToQti3, htmlToPm, pmToHtml, validateHtml, schemaToJson } from '@citolab/prose-qti-node';
```

One import. No DOM setup, no globals, no flags. This is the surface for tooling: importers,
generators, batch conversion, anything that runs in CI.

## Why this is its own package

It used to be `@citolab/prose-qti/node`, and installing it for Node-only use pulled 13
`@qti-components/*` browser component packages plus `lit` peer warnings — a component graph a script
never touches. The code was never the problem: the bundle imports only `linkedom` and
`prosemirror-*`, with everything else inlined. The *manifest* around it was sized for browser
consumers.

So the manifest was split, not the code. This package installs ~30 packages, no `@qti-components`,
no `lit`, and no peer warnings.

`prosemirror-model`, `prosemirror-state` and `prosemirror-commands` are **peer** dependencies rather
than direct ones, deliberately: ProseMirror compares node types by identity, so a second private copy
of `prosemirror-model` would make documents from this package incomparable with your own.

## The functions

| | |
|---|---|
| `qti3ToPm(xml, options?)` | QTI (or roundtrip) XML → ProseMirror document |
| `pmToQti3(doc, options?)` | ProseMirror document → QTI XML, response declarations and all |
| `htmlToPm(html, options?)` | HTML → ProseMirror document |
| `pmToHtml(doc, options?)` | ProseMirror document → HTML |
| `validateHtml(html, options?)` | did this HTML survive the schema unchanged? |
| `schemaToJson(schema?)` | the grammar as plain JSON |

`createQtiSchema(options?)` builds the schema they default to. `include: ['qti-order-interaction']`
narrows it to one interaction; `schema` supplies your own.

```js
const doc = qti3ToPm(readFileSync('ITEM001.xml', 'utf8'), { assetBasePath: '/qti/kennisnet' });
const xml = pmToQti3(doc);
```

`htmlToPm` needs the two document attributes HTML cannot carry:

```js
htmlToPm('<p>Water boils at 100 degrees.</p>', { identifier: 'ITEM001', title: 'Boiling point' });
```

**One trap, and it costs a wrong answer rather than an error:** do not pass `assetBasePath` when
re-importing XML that `pmToQti3` produced. The export already carries rewritten asset URLs, so
applying the base again prefixes them twice. Every fixture with an `<img>` then fails an identity
check on attributes while its node count matches exactly, which reads exactly like a real regression.

## `validateHtml` — the function the rest exists for

A generator writes HTML; this says whether the schema kept it, and what it changed if not.

```js
const result = validateHtml('<qti-prompt><table>…</table></qti-prompt>', { identifier: 'X', title: 'X' });

result.valid          // false
result.changes        // what the schema added and removed, with paths
result.normalizedHtml // the corrected form — hand this back to the generator
result.suspect        // true when the difference is probably OUR bug, not the input's
```

```
removed <qti-prompt> at qti-prompt[0] was dropped — the schema does not allow it there
added   <p> appeared at table[0]/tbody[0]/tr[0]/td[0]/p[0] — the schema inserted it
```

**Why it cannot just parse and catch an error.** ProseMirror's parser never rejects invalid markup —
it *coerces*, silently dropping what does not fit and lifting what sits in the wrong place, and it
never throws. So validation compares the input against what the schema gave back; the difference is
the report.

Content is **lifted, not discarded**. Above, the prompt disappears but the table and its text
survive, so the corrected form is usable rather than lossy — a structural mistake does not cost the
author their words.

Moves are deliberately not reported. Lifting that table moves its `tbody`, `tr` and `td` with it, so
one conceptual event becomes four "moved" lines, none of which is the part worth fixing.

### Read this before trusting a failure

`pm → html → pm` is **not** an identity on the whole regression corpus — 11 of 16 fixtures at the
last measurement. Match interactions gain nodes on re-parse (ITEM007–010, e.g. 36 → 45) because the
parser fills required content the serialized form no longer distinguishes, and ITEM006 differs at an
identical node count. When a difference involves those, `result.suspect` is `true`. Do not hand a
suspect result back to a generator as if it were the generator's mistake.

## `schemaToJson` — the grammar as data

For a consumer that needs to *read* the document model rather than build one: out of process, in
another language, or as context for a generator.

```js
writeFileSync('schema.json', JSON.stringify(schemaToJson(), null, 2));
```

42 nodes, 4 marks, 4 groups, about 14 KB. One node, attributes abridged:

```json
"qtiGapMatchInteraction": {
  "tagName": "qti-gap-match-interaction",
  "content": "qtiPrompt? qtiGapText+ paragraph+",
  "group": "block",
  "defining": true,
  "isolating": true,
  "attrs": { "maxAssociations": { "default": 0 }, "correctResponse": { "default": null } }
}
```

It returns a value rather than writing a file, deliberately. A generator that wrote
`content-model.json` to disk used to live in `schema/`, with committed fixtures and a version
fingerprint, and all of that machinery existed for one reason: a description of the schema sitting on
disk drifts from the schema it describes. Read off the live schema on demand, there is nothing to
drift.

### Not a replacement for `custom-elements.json`

The repo publishes two contracts answering different questions. `custom-elements.json` says which
elements exist and what attributes they take, in a standard format. This says what may nest inside
what. A custom elements manifest cannot express `qtiPrompt? qtiGapText+ paragraph+`, so neither
subsumes the other.

## Verifying it still works

`apps/e2e/spike-node-roundtrip.mjs` runs the whole surface over the regression corpus under plain
`node`, with no test runner:

```sh
cd apps/e2e && node spike-node-roundtrip.mjs
```

It reports snapshot reproduction and both identity directions, so the numbers quoted above can be
re-derived rather than trusted.

## Related

- [The roundtrip QTI format](./roundtrip-format.md) — what the XML these functions read and write means
