# qti-editor

pnpm workspace monorepo. Full architecture reference: [docs/architecture.md](docs/architecture.md) (read it before deciding where new code belongs). Editor-building patterns: [docs/cookbook.md](docs/cookbook.md). Local qti-components dependency workflow: [docs/syncing-with-qti-components.md](docs/syncing-with-qti-components.md).

## Layout

- `packages/` — reusable, published logic. Not `apps/*` — see architecture.md's "Core Rule" for the ownership test.
- `apps/` — runnable examples/demos/the main editor app. Not the source of truth for reusable behavior.
- `docs/` — architecture + cookbook reference (source of truth, keep in sync with code).
- `apps/site/src/content/docs/` — Astro-rendered public docs site content (getting-started, packages, prosemirror-plugins, qti-interactions, frameworks, using-the-registry). This is what docs-sync automation updates, not `docs/`.

## Packages (`packages/*`)

| Package | Name | Private | Description |
|---|---|---|---|
| `prose-qti` | `@citolab/prose-qti` | no | QTI core: all interactions, integration layer, interfaces |
| `prose-extensions` | `@citolab/prose-extensions` | no | Generic ProseMirror/ProseKit extensions |
| `prose-qti-ui` | `@citolab/prose-qti-ui` | yes | Copyable UI components (shadcn-style registry) |
| `prose-ai` | `@citolab/prose-ai` | yes | AI extensions for ProseKit, vendored from `@prosekit/ai` |

## Apps (`apps/*`)

| App | Package | Stack |
|---|---|---|
| `qti-prosekit-app` | `@qti-editor/prosekit-app` | Full editor: Firebase + React. `pnpm dev` |
| `qti-prosekit-item` | `@qti-editor/prosekit-item` | Minimal ProseKit + QTI example |
| `qti-prosemirror-item` | `@qti-editor/prosemirror-item` | Raw ProseMirror + QTI roundtrip |
| `site` | `@qti-editor/site` | Astro documentation site. `pnpm site:dev` |
| `e2e` | — | E2E tests |

## Common commands

- `pnpm build:packages` — build the three public/registry packages in dependency order (needed before most app builds).
- `pnpm test` / `pnpm test:watch` — vitest.
- `pnpm lint:check` — eslint, no autofix.
- `pnpm registry:build` / `pnpm registry:serve` — build/serve the `prose-qti-ui` component registry.
- `pnpm qti-overrides:status` — show whether a local `qti-components` override is pinned (see syncing doc).
