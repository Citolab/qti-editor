# Release Plan

This repository has three delivery channels that should remain separate:

1. npm packages for reusable library surfaces
2. Firebase Hosting deploys for first-party apps and the documentation site
3. Firebase-hosted registry artifacts from `packages/prose-qti-ui`

## npm Release Surface

The publishable packages are:

- `@citolab/prose-qti` — QTI core, interactions, integration surfaces
- `@citolab/prose-extensions` — generic ProseMirror/ProseKit extensions

Keep private:

- `@citolab/prose-qti-ui` — distributed through the registry and Firebase hosting, not npm
- `@citolab/prose-ai` — app-only AI extensions vendored from `@prosekit/ai`, consumed directly by `apps/qti-prosekit-item`, not published
- `apps/*` — not published

## Rationale

- `@citolab/prose-qti` is the main reusable authoring API: interaction descriptors, QTI composition, XML serialization, ProseKit integration.
- `@citolab/prose-extensions` is the stable generic editor extension surface: attributes engine, block select, node-attrs sync, semantic paste.
- `@citolab/prose-qti-ui` is distributed through the shadcn-style registry rather than npm — consumers install components directly from the hosted registry JSON.
- `@citolab/prose-ai` is vendored, app-only AI tooling with no stable public API of its own; it has no reason to be an npm surface.

## Workflow Split

### Packages

- Versioning is commit-message driven via `multi-semantic-release` (see `release.config.cjs`), not Changesets — there is no version PR step. Each publishable package is tagged and released independently as `<name>@<version>` based on Angular-style conventional commits (`fix:`, `feat:`, etc.) touching that package's path.
- The release workflow (`.github/workflows/release.yml`) runs after `CI: push-quality` succeeds on `main`, and only proceeds when the triggering push touched a release-relevant path (`package.json`, `pnpm-lock.yaml`, `packages/prose-qti/`, `packages/prose-extensions/`, or the release workflow itself).
- Release publishes with `pnpm publish --provenance`, which rewrites each package's internal `workspace:*` dependency ranges (see below) to real published semver ranges before publishing — no `NPM_TOKEN` is required because npm trusted publishing (OIDC) is configured.
- A successful release commits `CHANGELOG.md` back to `main` with `chore(release): <version> [skip ci]`, which is filtered back out of the release-relevant-paths check so it does not retrigger itself. `package.json` is deliberately **not** committed back — see below.

### Internal Package Dependencies

- Packages that depend on another publishable package in this repo (e.g. `@citolab/prose-extensions` depends on `@citolab/prose-qti`) declare that dependency with the pnpm `workspace:*` protocol, never a pinned version. Pinning it manually goes stale the moment the depended-on package's version bumps and breaks local installs/CI (see the `fix: workspace resolution` and `fix: try pinning pkg versions due to ci breakage` commits).
- `workspace:*` is only valid for local development; `pnpm publish` rewrites it to a real version range automatically at publish time, so consumers installing from npm never see the `workspace:*` specifier.
- That rewrite happens unconditionally: `multi-semantic-release`'s dependency-update step resolves `workspace:*` to a concrete version in every manifest *before* publishing, ahead of anything `--deps.bump` could otherwise control. It is correct for the published tarball and wrong for this repo's own `package.json` — committing it back leaves `package.json` disagreeing with `pnpm-lock.yaml` (which still holds `workspace:*`), which fails `pnpm install --frozen-lockfile` on the next push. Release commits carry `[skip ci]`, so CI does not catch this at release time; the breakage instead surfaces later, pointing at a manifest nobody touched. This is why `@semantic-release/git`'s `assets` list in `release.config.cjs` includes only `CHANGELOG.md` — `package.json` is never committed back, so the rewritten `workspace:*` value never reaches `main`.

### Site Hosting

- Deploy Firebase target `hosting:site` on changes to `apps/site` and shared package/config paths.
- Site deploy includes:
  - Astro site
  - Storybook
  - Registry JSON under `/r/`

### Editor Hosting

- Deploy Firebase target `hosting:editor` on changes to `apps/qti-prosekit-app` and shared package/config paths.
- Editor deploy is isolated from the site target.

## Operational Notes

- Registry changes do not create npm releases.
- Registry changes trigger the site hosting workflow because the registry is served from the site target.
- `apps/qti-prosekit-item` and `apps/qti-prosemirror-item` are reference examples and are not deployed to Firebase.

## Required Secrets

- `FIREBASE_TOKEN` for Firebase Hosting deploys
- `RELEASE_BOT_TOKEN` is optional; `GITHUB_TOKEN` is used as fallback for GitHub release metadata
- No `NPM_TOKEN` is required when npm trusted publishing is configured for this repository
