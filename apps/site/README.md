# site

The public landing page and documentation site for QTI Editor. Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## Running

```bash
pnpm dev
```

The build also runs a type-check first:

```bash
pnpm build   # astro check && astro build
```

## Structure

```
src/
  pages/          # Landing page (index.astro)
  content/docs/   # Starlight docs — MDX files organized by section
    getting-started/
    using-the-registry/   # UI component docs (toolbar, attributes panel, etc.)
    packages/             # Package reference docs
    qti-interactions/     # Per-interaction docs
    frameworks/           # Integration guides (React, Angular, Vue, Svelte, Vanilla)
  components/     # Astro components used by the landing page and custom Starlight overrides
  editor/         # Live editor instances embedded in docs pages
```

## Docs sections

| Section | Content |
|---|---|
| Getting Started | Overview and installation |
| Using the Registry | Docs for each UI component in `@qti-editor/ui` |
| Package Reference | Docs for published packages (prosemirror-plugins, roundtrip import/export) |
| QTI Interactions | Per-interaction reference (choice, text entry, gap match, …) |
| Framework Guides | React, Angular, Vue, Svelte, and Vanilla JS integration guides |

## Live editor in docs

The site embeds a working editor inside docs pages (see `src/editor/`). This editor is built from source via Vite aliases in [astro.config.mjs](astro.config.mjs) — no pre-built packages needed during development.
