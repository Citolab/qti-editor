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

- `@citolab/prose-ai` — app-only AI extensions vendored from `@prosekit/ai`, not published and not currently consumed by anything in this repository
- `apps/*` — not published

## Rationale

- `@citolab/prose-qti` is the main reusable authoring API: interaction descriptors, QTI composition, XML serialization, ProseKit integration.
- `@citolab/prose-qti-node` exists because installing `@citolab/prose-qti` for its Node-only conversion functions pulled in all 13 `@qti-components/*` browser packages and `lit` peer warnings a script never touches — the conversion code was fine, the manifest wasn't. See [node-api.md](node-api.md).
- `@citolab/prose-extensions` is the stable generic editor extension surface: attributes engine, block select, node-attrs sync, semantic paste.
- `@citolab/prose-ai` is vendored, app-only AI tooling with no stable public API of its own; it has no reason to be an npm surface.

## Workflow Split

### Packages

- Versioning is commit-message driven via `multi-semantic-release` (see `release.config.cjs`), not Changesets — there is no version PR step. Each publishable package is tagged and released independently as `<name>@<version>` based on Angular-style conventional commits (`fix:`, `feat:`, etc.) touching that package's path.
- The release workflow (`.github/workflows/release.yml`) runs after `CI: push-quality` succeeds on `main`, and only proceeds when the triggering push touched a release-relevant path (`package.json`, `pnpm-lock.yaml`, `packages/prose-qti/`, `packages/prose-qti-node/`, `packages/prose-extensions/`, or the release workflow itself). `packages/prose-qti-node/` is listed explicitly rather than relying on the `packages/prose-qti/` prefix to catch it — that pattern doesn't match, since `-node` sits before the slash, so a change touching only the new package would otherwise never trigger a release.
- Release publishes with `pnpm publish --provenance`, which rewrites each package's internal `workspace:*` dependency ranges (see below) to real published semver ranges before publishing — no `NPM_TOKEN` is required because npm trusted publishing (OIDC) is configured.
- A successful release commits the bumped `package.json` and `CHANGELOG.md` back to `main` with `chore(release): <version> [skip ci]`, which is filtered back out of the release-relevant-paths check so it does not retrigger itself.

### Internal Package Dependencies

- Packages that depend on another publishable package in this repo (e.g. `@citolab/prose-extensions` depends on `@citolab/prose-qti`) declare that dependency with the pnpm `workspace:*` protocol, never a pinned version. Pinning it manually goes stale the moment the depended-on package's version bumps and breaks local installs/CI (see the `fix: workspace resolution` and `fix: try pinning pkg versions due to ci breakage` commits).
- `workspace:*` is only valid for local development; `pnpm publish` rewrites it to a real version range automatically at publish time, so consumers installing from npm never see the `workspace:*` specifier.

### Site Hosting

- Deploy Firebase target `hosting:site` on changes to `apps/site` and shared package/config paths.
- Site deploy includes:
  - Astro site
  - Storybook

## Operational Notes

- `apps/qti-prosemirror-item` is a reference example and is not deployed to Firebase.
- There is only one hosting target left here (`hosting:site`). The `hosting:editor` target moved to
  the editor's own repository, which deploys to the same Firebase project and site
  (`qti-editor-playground`) so its URL did not change.

## Required Secrets

- `FIREBASE_TOKEN` for Firebase Hosting deploys
- `RELEASE_BOT_TOKEN` is optional; `GITHUB_TOKEN` is used as fallback for GitHub release metadata
- No `NPM_TOKEN` is required when npm trusted publishing is configured for this repository
