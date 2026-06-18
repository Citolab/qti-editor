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
- `apps/*` — not published

## Rationale

- `@citolab/prose-qti` is the main reusable authoring API: interaction descriptors, QTI composition, XML serialization, ProseKit integration.
- `@citolab/prose-extensions` is the stable generic editor extension surface: attributes engine, block select, virtual cursor, compatibility migrations.
- `@citolab/prose-qti-ui` is distributed through the shadcn-style registry rather than npm — consumers install components directly from the hosted registry JSON.

## Workflow Split

### Packages

- Changesets runs on `main`.
- When a changeset is present, GitHub Actions opens or updates a version PR.
- Once the version PR lands on `main`, the same workflow publishes changed non-private packages to npm.

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
