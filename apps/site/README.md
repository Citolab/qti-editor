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
    packages/             # Package reference docs
    qti-interactions/     # Per-interaction docs
    frameworks/           # Integration guide (TypeScript / pure ProseMirror)
  components/     # Astro components used by the landing page and custom Starlight overrides, including the qti-demo/ live editor preview
```

## Docs sections

| Section | Content |
|---|---|
| Getting Started | Overview and installation |
| Package Reference | Docs for published packages (prosemirror-plugins, roundtrip import/export) |
| QTI Interactions | Per-interaction reference (choice, text entry, gap match, …) |
| Framework Guides | TypeScript / pure ProseMirror integration guide |

## Live editor on the landing page

The landing page embeds a working editor (see `src/components/qti-demo/`), mirroring the pattern taught in the [TypeScript Integration](src/content/docs/frameworks/vanilla.mdx) guide. It's built from source via Vite aliases in [astro.config.mjs](astro.config.mjs) — no pre-built packages needed during development.
