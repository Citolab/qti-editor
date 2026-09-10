# qti-editor

A ProseMirror-based editor kit to aid authoring QTI 3.0 assessment items in a WYSIWYG (what you see is what you get) style.

This is a monorepo of composable pieces — interaction nodes, schema, serialization, UI components —
that you can assemble into a full editor or drop into your own tooling piecemeal. It renders QTI interactions using our [qti-components](https://github.com/Citolab/qti-components): the same custom elements that render to a user when they take a test, you what you see is truly what you get.

Full documentation: **[qti-editor.citolab.nl](https://qti-editor.citolab.nl/)**.

## Dev setup

Prerequisites: [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```sh
pnpm install
pnpm dev          # runs the example editor, http://localhost:5175
```

`pnpm dev` watches the packages, so a change in `packages/` reloads the app. Other entry points:

```sh
pnpm storybook    # component and interaction stories, port 6008
pnpm test         # unit + browser tests
pnpm test:vrt     # visual regression against the committed baselines
```

`just` wraps the common ones (`dev`, `test`, `vrt`) — run it with no arguments for the menu.

## How it fits together

An item is a ProseMirror document whose nodes are QTI elements. The schema is composed from
**interaction descriptors**: each interaction contributes its node specs, commands, plugins and
composer metadata, and the schema, the Insert menu and the attributes panel are all derived from that
one registry.

The editor saves a QTI **item body**, not a whole assessment item, and carries authoring state (which answer is correct, what an interaction is worth) 
as attributes on the elements themselves. Export folds those into standard response declarations and strips them, so what leaves the editor is
plain QTI 3.0 with no editor-specific markup. See [the roundtrip format](./docs/roundtrip-format.md).

## Packages

| package | published | what it is |
|---|---|---|
| `@citolab/prose-qti` | yes | the editor core: schema, interaction descriptors, item roundtrip |
| `@citolab/prose-qti-node` | yes | conversion package for usage in plain Node |
| `@citolab/prose-extensions` | yes | custom ProseMirror extensions not specific to QTI |

**Building a QTI editor?** Importing `@citolab/prose-qti` will add QTI support to your new or existing ProseMirror instance. 
The item stylesheet and the QTI transformers are re-exported from it through `@citolab/prose-qti/qti-prose.css` and
`@citolab/prose-qti/transformers`.

**Converting QTI in a script, a server or CI?** Use `@citolab/prose-qti-node` instead. It is the
same conversion code, bundled, and it installs ~30 packages with no `@qti-components` and no `lit` dependencies —
useful when you need only the script, not an in-browser experience.

## Documentation

Please refer to **[qti-editor.citolab.nl](https://qti-editor.citolab.nl/)** for full documentation.

## Contributing

We welcome your contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md).
