# qti-editor

A ProseMirror-based editor for authoring QTI 3.0 assessment items.

It is a monorepo of composable packages — interaction nodes, schema, serialization, UI components —
that assemble into a full editor or drop into your own tooling piecemeal. The rendering half comes
from [qti-components](https://github.com/Citolab/qti-components): the same custom elements that
display an item to a candidate display it to its author, so what you edit is what gets sat.

Full documentation: **[qti-editor.citolab.nl](https://qti-editor.citolab.nl/)**.

## Dev setup

Prerequisites: [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```sh
pnpm install
pnpm dev          # the editor, http://localhost:5175
```

`pnpm dev` watches the packages, so a change in `packages/` reloads the app. Other entry points:

```sh
pnpm storybook    # component and interaction stories, port 6008
pnpm test         # unit + browser tests
pnpm test:vrt     # visual regression against the committed baselines
```

`just` wraps all of these — run it with no arguments for the menu.

## How it fits together

An item is a ProseMirror document whose nodes are QTI elements. The schema is composed from
**interaction descriptors**: each interaction contributes its node specs, commands, plugins and
composer metadata, and the schema, the Insert menu and the attributes panel are all derived from that
one registry. Adding an interaction means adding a descriptor rather than editing six files.

The editor saves a QTI **item body**, not a whole assessment item, and carries authoring state —
which answer is correct, what an interaction is worth — as attributes on the elements themselves.
Export folds those into standard response declarations and strips them, so what leaves the editor is
plain QTI 3.0 with no editor-specific markup. See
[the roundtrip format](./docs/roundtrip-format.md).

None of that conversion needs a browser. The same pipeline runs under plain `node`, which is what
makes batch import, CI checks and generator feedback possible — see the
[Node API](./docs/node-api.md).

## Packages

| package | published | what it is |
|---|---|---|
| `@citolab/prose-qti` | yes | schema, interaction descriptors, item roundtrip, node API |
| `@citolab/prose-extensions` | yes | ProseMirror extensions not specific to QTI |
| `@citolab/prose-qti-ui` | no | toolbar, insert menu, attributes panel |
| `@citolab/prose-ai` | no | authoring assistance, experimental |

A host app declares `@citolab/prose-qti` and nothing else from the QTI stack. The item stylesheet and
the QTI transformers are re-exported from it — `@citolab/prose-qti/qti-prose.css` and
`@citolab/prose-qti/transformers` — so which qti-components build the editor is pinned against stays
this repo's problem rather than the host's.

## Documentation

- [docs/architecture.md](./docs/architecture.md) — package topology and ownership rules
- [docs/roundtrip-format.md](./docs/roundtrip-format.md) — the format the editor reads and writes,
  and how `correct-response`, `score` and select-point's area mappings survive a round trip
- [docs/node-api.md](./docs/node-api.md) — converting QTI outside a browser, and validating generated
  HTML against the schema

## Contributing

CI runs build, lint, typecheck, unit and browser tests, Storybook and the docs site on every push.
Visual regression baselines live in `apps/e2e/stories/__vrt__` and are committed — a re-blessed
screenshot is a claim to check, not a formality.
