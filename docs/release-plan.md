# Release Plan

This repository has two delivery channels that should remain separate:

1. npm packages for reusable library surfaces
2. A Firebase Hosting deploy for the documentation site

The editor application is **not** a delivery channel of this repository any more — it lives in its
own repository (`qti-editor-full-assessment`), consumes the npm packages, and deploys itself. The
shadcn-style component registry that used to be a third channel has been retired outright.

## npm Release Surface

The publishable packages are:

- `@citolab/prose-qti` — QTI core, interactions, integration surfaces
- `@citolab/prose-qti-node` — the same conversion API, re-bundled for plain Node with no browser or `@qti-components/*` dependencies
- `@citolab/prose-extensions` — generic ProseMirror/ProseKit extensions

Keep private:

- `apps/*` — not published

## Rationale

- `@citolab/prose-qti` is the main reusable authoring API: interaction descriptors, QTI composition, XML serialization, ProseKit integration.
- `@citolab/prose-qti-node` exists because installing `@citolab/prose-qti` for its Node-only conversion functions pulled in all 13 `@qti-components/*` browser packages and `lit` peer warnings a script never touches — the conversion code was fine, the manifest wasn't. See [node-api.md](node-api.md).
- `@citolab/prose-extensions` is the stable generic editor extension surface: attributes engine, block select, node-attrs sync, semantic paste.

## Workflow Split

### Packages

- Versioning is **Changesets**-driven, matching `qti-components`. A PR that changes published
  behaviour carries a changeset (`pnpm run changeset`) declaring the affected packages and bump
  level; those markdown files accumulate under `.changeset/` on `main`.
- **Nothing publishes on merge.** Releasing is a deliberate act: run the
  `Manual: release and publish packages (changesets)` workflow
  (`.github/workflows/release.yml`) from the Actions tab when the accumulated set is worth a
  release. It takes a `branch` (default `main`) and a `dry_run` flag; a dry run prints
  `changeset status` and a snapshot version preview, then reverts, without committing, tagging or
  publishing anything.
- The filename `release.yml` is load-bearing: npm trusted publishing binds each package to a
  repository plus a workflow filename, so renaming the file breaks publishing. The workflow's
  `name:` is cosmetic and matches `qti-components`.
- A real run applies `changeset version`, regenerates `custom-elements.json`, commits
  `chore(release): changesets version [skip ci]`, builds via `pnpm build:packages` (dependency
  order matters — prose-qti resolves prose-extensions through a project reference), publishes, tags
  each package as `<name>@<version>`, pushes commit and tags, and opens a GitHub release for
  `@citolab/prose-qti`.
- Publishing goes through `tools/publish-if-needed.mjs`, which is idempotent: it asks npm whether
  `<name>@<version>` exists and skips it if so. `changeset publish` is deliberately not used — see
  the comment in the workflow.
- No `NPM_TOKEN` is required: npm trusted publishing (OIDC) is configured, and
  `--provenance` uses the GitHub Actions OIDC token.
- Unlike the previous `multi-semantic-release` setup, the committed `package.json` `version` field
  **is** the source of truth and is committed back. Under semantic-release it deliberately was not,
  so the manifests drifted behind npm (prose-qti sat at 1.14.0 while npm had 1.21.0). The migration
  resynced all three to their published versions; keeping them accurate now matters, because
  Changesets computes the next version from the manifest and an already-published result is
  silently skipped rather than failing.
- CI runs an **advisory** `changeset-check` job on pull requests. It reports whether a changeset is
  present but never fails: a PR touching no published behaviour legitimately has none, and blocking
  would only train people to add empty ones.

### Internal Package Dependencies

- Packages that depend on another publishable package in this repo (e.g. `@citolab/prose-extensions` depends on `@citolab/prose-qti`) declare that dependency with the pnpm `workspace:*` protocol, never a pinned version. Pinning it manually goes stale the moment the depended-on package's version bumps and breaks local installs/CI (see the `fix: workspace resolution` and `fix: try pinning pkg versions due to ci breakage` commits).
- `workspace:*` is only valid for local development; `pnpm publish` rewrites it to a real version range automatically at publish time, so consumers installing from npm never see the `workspace:*` specifier.

### Site Hosting

- Deploy Firebase target `hosting:site` on changes to `apps/site` and shared package/config paths.
- Site deploy includes:
  - Astro site
  - Storybook

## Operational Notes

- `apps/qti-example-editor` is a reference example and is not deployed to Firebase.
- There is only one hosting target left here (`hosting:site`). The `hosting:editor` target moved to
  the editor's own repository, which deploys to the same Firebase project and site
  (`qti-editor-playground`) so its URL did not change.

## Required Secrets

- `FIREBASE_TOKEN` for Firebase Hosting deploys
- `RELEASE_BOT_TOKEN` is optional; `GITHUB_TOKEN` is used as fallback for GitHub release metadata
- No `NPM_TOKEN` is required when npm trusted publishing is configured for this repository
