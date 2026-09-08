# Changesets

Changesets track which packages changed and what version bump they need.

## For contributors

Adding a changeset is **optional but appreciated**. If your PR changes published package behavior, you can run:

```bash
pnpm run changeset
```

This will prompt you to select the affected packages, the semver bump type (patch/minor/major), and a short summary. Commit the generated markdown file under `.changeset/`.

Don't worry if you're unsure — a maintainer will add or adjust the changeset before merging.

## For maintainers

Ensure every PR that changes published package behavior has a changeset before merging. If the contributor didn't add one, add it yourself.

The `Manual: release and publish packages (changesets)` workflow consumes pending changesets, versions packages, and publishes them.

## Why there is no umbrella check here

qti-components carries a `changeset:check-umbrella` gate because its umbrella package reaches
every workspace package through **devDependencies**, and Changesets hard-codes devDependencies to
produce no dependent bump — so the umbrella could silently go unpublished.

This repo has no such case. `@citolab/prose-qti` depends on `@citolab/prose-extensions` through
`dependencies` (`workspace:*`), which Changesets bumps natively, so the policy that script enforces
is already the default here. If a publishable package is ever added that is reached only via
devDependencies, port that gate across.
