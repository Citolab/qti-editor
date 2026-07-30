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
"@qti-components/base": "https://pkg.pr.new/Citolab/qti-components/@qti-components/base@60f8b03",
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

## Deterministic local link workflow (no yalc)

For fast local iteration, this repo includes deterministic link/unlink commands
managed entirely by qti-editor.

- `pnpm link` - enables source-link mode via `.qti-components-local-link-state.json`, builds `@qti-components/theme` CSS output, starts an editor-owned qti-theme CSS watcher, clears editor caches, and runs `pnpm install`
- `pnpm unlink` - disables source-link mode, stops the qti-theme watcher, and runs `pnpm install`
- `pnpm link:status` - reports whether local link mode is active

In source-link mode, JS/TS imports resolve directly to qti-components source files.
Theme CSS imports resolve to `@qti-components/theme/dist/*.css` because qti-theme
source CSS requires PostCSS mixin expansion.

**The mode reaches the Storybook dev server and nothing else.** `.storybook/main.ts` is the state
file's only consumer, and it turns it into Vite aliases. `node_modules/@qti-components` still holds
the published packages, so eslint, tsc, vitest and every build resolve the same either way — which
is worth knowing in both directions: nothing local can leak into a commit, and a green local
storybook is not evidence that CI will build.

Two things follow from Vite resolving those aliases once, when the dev server boots:

- `pnpm link` / `pnpm unlink` cannot reach a storybook that is already running. Restart it, or the
  server keeps serving the mode it booted with while `pnpm link:status` reports the new one.
- Storybook prints the active mode at startup (`[qti-components] LOCAL SOURCE — N aliases from …`),
  which is the quickest way to see which qti-components you are actually looking at.

While linked, the state file also lists every binding it installed, so `cat
.qti-components-local-link-state.json` shows exactly which specifiers were redirected where. That
list is written for reading only — `main.ts` re-derives the real aliases from `qtiComponentsRoot`,
so a stale entry cannot mis-resolve a module.

The qti-theme watcher runs from qti-editor and rebuilds only `@qti-components/theme`
when qti-theme source CSS changes. It is managed by the same
`scripts/qti-components-local-link.mjs` script (single-script workflow).
Log file: `.qti-components-theme-watch.log`.

`pnpm link` is idempotent: when already linked, rerun it to refresh the local setup
(rebuilds qti-theme CSS, clears Vite + Storybook caches, and re-runs install).

Optional environment override:

- `QTI_COMPONENTS_PATH=/absolute/path/to/QTI-Components pnpm link`

Safety guard:

- commits are blocked if staged `package.json` files still contain `link:` specs for `@qti-components/*` or `@citolab/qti-components`
- staged `file:.yalc/` deps are retreated and re-staged automatically

You do **not** need to unlink before committing. The pre-commit hook used to block commits while
source-link mode was active; that check was removed because the mode writes nothing tracked (see
above) — it only cost an unlink/relink cycle around every commit. The two guards that remain cover
`link:` and `file:.yalc/` deps, which are written into tracked `package.json` files and can go live.

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
