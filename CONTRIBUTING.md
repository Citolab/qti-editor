# Contributing to QTI Editor

## Setup

1. Install [Node.js](https://nodejs.org/) 24 or later and [pnpm](https://pnpm.io/) (pinned via
   `packageManager` — `corepack enable` will pick up the right version automatically)
2. Clone the repository and run `pnpm install`

## Project Structure

- `packages/` — npm packages (`prose-qti`, `prose-qti-node`, `prose-extensions` are published;
  `prose-ai` is private)
- `apps/qti-example-editor` — the reference editor used for local dev; not deployed
- `apps/site` — documentation site (Astro + Starlight), deployed to Firebase Hosting
- `apps/e2e` — end-to-end and visual-regression tests, including the committed VRT baselines in
  `stories/__vrt__`
- `docs/` — architecture and contract docs, indexed from the [README](./README.md#documentation)

Apps don't import from each other, in TS or CSS. Shared code belongs in a package with its own
subpath export.

## Development

Start the editor with `pnpm dev`:

- Editor: http://localhost:5175

Other entry points:

- `pnpm site:dev` — the docs site, http://localhost:4321
- `pnpm storybook` — component and interaction stories, port 6008

Useful commands:

- `pnpm build:packages` — build the publishable packages, in dependency order
- `pnpm lint` — lint and auto-fix; `pnpm lint:check` for CI's non-fixing pass
- `pnpm typecheck` — type check packages and `apps/e2e`
- `pnpm test` — unit + browser tests; `pnpm test:watch` for a watch loop
- `pnpm test:vrt` — visual regression against the committed baselines; `pnpm test:vrt:update` to
  re-bless them after an intentional visual change

`just` wraps the common ones (`dev`, `test`, `vrt`) — run it with no arguments for the menu.

A pre-commit hook already runs `eslint --fix` and `vitest run --changed` against your staged files,
so most of the above happens automatically on `git commit`. It only looks at the commit, though —
run `pnpm lint:check` and `pnpm test` yourself before opening a PR to see what CI will see.

## Pull Requests

1. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and PR
   titles — `feat:`, `fix:`, `docs:`, `chore:`, optionally scoped (`fix(prose-qti): …`).
2. Run `pnpm lint:check` and `pnpm typecheck`, and make sure `pnpm test` and `pnpm test:vrt` pass.
   `pnpm --filter @qti-editor/site run build` too, if you touched `apps/site` or a package's public
   API — the docs site build is part of CI.
3. If the change affects a published package's behavior, add a changeset:
   `pnpm changeset`, describing the change for whichever of `@citolab/prose-qti`,
   `@citolab/prose-qti-node`, `@citolab/prose-extensions` are affected. CI reports whether a
   changeset is present but doesn't block on it — a PR that touches no published behavior
   legitimately has none.
4. A re-blessed VRT screenshot is a claim to check, not a formality — explain in the PR what visual
   change it's recording.

CI (`.github/workflows/ci.yml`) builds the packages, lints, typechecks, runs the full test suite,
builds Storybook, and builds the docs site on every push and PR. All of that should be green before
review.

Releasing itself is a separate, manual step — see [docs/release-plan.md](./docs/release-plan.md) if
you're curious how versioning and publishing work; contributors don't need to do anything beyond
step 3 above.

## Questions & Issues

Open an issue at [github.com/Citolab/qti-editor/issues](https://github.com/Citolab/qti-editor/issues).
