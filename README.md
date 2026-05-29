# qti-editor

A ProseMirror-based editor for authoring QTI 3.0 assessment items. It is built as a monorepo of composable packages — interaction nodes, attributes, serialization, and UI components — that can be assembled into a full editor or integrated piecemeal into your own tooling.

Full documentation is available at **[qti-editor.citolab.nl](https://qti-editor.citolab.nl/)**.

## Dev setup

Prerequisites: [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```sh
pnpm install
pnpm dev
```

This starts the main editor app and watches packages for changes. The editor runs at `http://localhost:5173` by default.

## Documentation

- [docs/architecture.md](./docs/architecture.md) — package topology and ownership rules
- [Itembody-only QTI subformat](./apps/site/src/content/docs/packages/itembody-subformat.mdx) — the itembody-only QTI subformat the editor reads and writes (also published on the docs site under Package Reference)
