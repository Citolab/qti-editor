# Syncing the editor with `qti-components`

> **Status:** temporary documentation while the editor consumes the
> `breaking-changes-for-editor-release` branch of qti-components via
> [pkg.pr.new](https://pkg.pr.new) commit builds. Once qti-components ships a
> stable release containing those changes, every `@qti-components/*` (and
> `@citolab/qti-components`) dependency goes back to a normal npm semver
> range and this doc can be removed.

This editor depends on packages from a sibling repo, **qti-components**,
which hasn't shipped a stable release with the breaking changes the editor
needs yet. Instead of npm ranges, the relevant dependencies are pinned
directly to a pkg.pr.new build of a specific `qti-components` commit:

```json
"@qti-components/base": "https://pkg.pr.new/Citolab/qti-components/@qti-components/base@9f4841882b6b7239fcd72bada3ae4461fa46c6ce",
```

pkg.pr.new builds and publishes a real npm tarball for every commit pushed to
qti-components, so these URLs install exactly like any other npm dependency
— no yalc, linking, or local qti-components checkout required for teammates
or CI.

## Where the pins live

Every package/app that consumes `@qti-components/*` pins the same commit SHA
in its own `dependencies`/`devDependencies`:

- `packages/prose-qti/package.json` — the interaction components
  (`@qti-components/choice-interaction`, `@qti-components/base`, …)
- root `package.json` — `@qti-components/theme` (dev-only, used by apps for styling)
- `apps/e2e/package.json` — `@citolab/qti-components` (end-to-end test fixtures)
- `apps/qti-prosekit-app`, `apps/qti-prosekit-item`, `apps/qti-prosemirror-item`,
  `apps/site` — re-declare the same pinned packages where needed

## Bumping to a newer qti-components commit

Push your changes to the `breaking-changes-for-editor-release` branch on
qti-components first. Every dependency spec is pinned to an exact commit SHA
(`specifier` and `version` are identical in `pnpm-lock.yaml`), so there's no
semver range for `pnpm up` to move within — replace the old SHA with the new
commit's SHA in every `https://pkg.pr.new/Citolab/qti-components/...@<sha>`
occurrence (`packages/prose-qti/package.json`, root `package.json`,
`apps/e2e/package.json`, and the other app `package.json` files listed
above), then run `pnpm install` to update `pnpm-lock.yaml`.

Commit the updated `package.json` files and `pnpm-lock.yaml` together so
teammates and CI pick up the same pinned commit on their next `pnpm install`.

There's also a `pnpm qti-components:update` script
(`pnpm -r up "@qti-components/*" "@citolab/qti-components"`) left over from
when these dependencies were pinned to a floating branch URL instead of a
commit SHA. It's a no-op against today's SHA-pinned specifiers — use the
manual SHA replacement above instead.

## Local development against an unpushed qti-components checkout

There's no supported "live link" workflow anymore — pushing to qti-components
and re-pinning the SHA (above) is the whole loop. If you need to iterate
against local qti-components changes before pushing, use `pnpm link` /
`file:` dependencies temporarily in your own checkout, but don't commit that;
revert to the pinned pkg.pr.new URL before pushing the editor.

## Leftover files from the previous (yalc) workflow

This repo previously synced qti-components through a yalc-linking + pinned
local-tarball workflow (`pnpm dev:linked`, `pnpm-local-overrides.json`,
`.pnpmfile.cjs`, `qti-overrides:*`). That workflow was replaced by the
pkg.pr.new SHA pinning described above, but some of its files are still
present and effectively dormant:

- `.pnpmfile.cjs` — its `readPackage` hook no-ops as soon as it can't find
  `pnpm-local-overrides.json` (deleted), which is always, today.
- `scripts/qti-local-overrides-sync.mjs`, `scripts/qti-overrides-preinstall.mjs`,
  `scripts/dev-linked.mjs`, `scripts/yalc-init.mjs`, and the root
  `package.json` scripts `qti-overrides:*`, `yalc:*`, `dev:linked` — unused
  by the current workflow.

None of this needs to be run, and running it does nothing useful without a
committed `pnpm-local-overrides.json` to drive it.

## Why this design

- **Reproducibility across machines.** A pkg.pr.new URL pinned to a commit
  SHA resolves to the exact same tarball on every machine and in CI — no
  local qti-components checkout, no generated tarball cache, nothing
  gitignored to go stale.
- **No extra tooling.** pnpm installs a pkg.pr.new URL like any other
  dependency URL. Resolving it doesn't depend on the pnpm hook or scripts
  above.
- **Simple to bump.** Moving to a newer qti-components commit is a normal,
  reviewable `package.json` + `pnpm-lock.yaml` change (hand-edit the SHA, then
  `pnpm install`).

When qti-components ships a stable release containing the editor's required
changes, replace every `https://pkg.pr.new/...@<sha>` dependency with a
normal npm semver range, delete the leftover files above, and delete this
document.
