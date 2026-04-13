# Release Plan

This repository has three delivery channels and they should remain separate:

1. npm packages for reusable library surfaces
2. Firebase Hosting deploys for first-party apps
3. Firebase-hosted registry artifacts for `packages/ui`

## Recommended npm release surface

Publish with Changesets:

- `@qti-editor/interfaces`
- `@qti-editor/interaction-shared`
- `@qti-editor/interaction-choice`
- `@qti-editor/interaction-inline-choice`
- `@qti-editor/interaction-match`
- `@qti-editor/interaction-order`
- `@qti-editor/interaction-select-point`
- `@qti-editor/interaction-text-entry`
- `@qti-editor/interaction-extended-text`
- `@qti-editor/core`

Keep private for now:

- `@qti-editor/prosekit-integration`
- `@qti-editor/prosemirror`
- `@qti-editor/prosemirror-attributes`
- `@qti-editor/prosemirror-attributes-ui-prosekit`
- `@qti-editor/ui`
- `apps/*`

## Rationale

- The interaction packages already build to `dist`, declare public exports, and form the main reusable authoring API.
- `@qti-editor/interfaces` is the contract package at the bottom of the dependency graph.
- `@qti-editor/core` is the stable QTI semantics and composition surface above the interaction descriptors.
- `@qti-editor/prosekit-integration` is intentionally private because it is our in-house editor assembly layer; external consumers should compose directly from `prosekit` and the public `@qti-editor/*` packages.
- The `@qti-editor/prosemirror*` utility packages are currently treated as internal implementation details for the first-party editors.
- `@qti-editor/ui` is distributed through the registry and Firebase-hosted artifacts, not npm package releases.

## Workflow split

### Packages

- Changesets runs on `main`.
- When a changeset is present, GitHub Actions opens or updates a version PR.
- Once the version PR lands on `main`, the same workflow publishes changed non-private packages to npm.

### Site hosting

- Deploy Firebase target `hosting:site` on changes to `apps/site` and shared package/config paths.
- Site deploy includes:
  - Astro site
  - Storybook
  - UI registry under `/r`

### Editor hosting

- Deploy Firebase target `hosting:editor` on changes to `apps/editor` and shared package/config paths.
- Editor deploy is isolated from the site target.

## Operational notes

- Registry changes do not create npm releases.
- Registry changes do trigger the site hosting workflow because the registry is served from the site target.
- If `@qti-editor/prosekit-integration` ever becomes an external contract later, convert its exports to `dist/*` first and then deliberately change the docs and release policy together.
- If the generic `@qti-editor/prosemirror*` packages become public later, promote them deliberately with their own API review instead of publishing them incidentally.

## Required secrets

- No `NPM_TOKEN` is required for npm publishing when npm trusted publishing is configured for this repository and workflow.
- `FIREBASE_TOKEN` for Firebase Hosting deploys
- `RELEASE_BOT_TOKEN` is optional; `GITHUB_TOKEN` is used as a fallback for GitHub release metadata
