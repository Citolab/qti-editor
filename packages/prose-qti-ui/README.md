# `@citolab/prose-qti-ui`

This package is the canonical UI registry for the QTI editor monorepo.

It follows a shadcn-style registry layout so the same source can be:

- imported directly by apps inside this repo
- transformed into distributable registry artifacts
- used as a source of boilerplate code samples for reusable editor UI

The registry is intended primarily for internal use. The components here are the shared source of truth for monorepo apps and related editor packages, not a public, user-facing design system.

In practice, that means:

- keep component implementations here when they are meant to be reused across the editor
- use the registry metadata to generate or mirror component scaffolding
- treat the exported registry entries as implementation templates and examples, not as a separately supported external API

For local development and package export details, see `package.json` and `registry.json`.
