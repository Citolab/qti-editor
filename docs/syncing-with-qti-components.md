# Syncing the editor with `qti-components`

The editor depends on packages from a sibling repo, **qti-components**. Those are
ordinary npm dependencies on the published release train. The `pkg.pr.new`
commit-build pinning this document used to describe was retired on 2026-09-01,
when the editor's required breaking changes landed on npm.

## Where the versions live

Every `@qti-components/*` and `@citolab/qti-components` version is declared once,
in the `catalog:` block of `pnpm-workspace.yaml`. Consumers write
`"@qti-components/theme": "catalog:"`; pnpm substitutes the concrete range at
install time and again at pack/publish time, so the published
`@citolab/prose-qti` manifest carries real semver ranges and a consumer of it
does not need pnpm.

To move to newer components releases, edit the ranges in `pnpm-workspace.yaml`
and run `pnpm install`. Commit the workspace file and `pnpm-lock.yaml` together
so teammates and CI resolve the same versions.

One exception remains: `@qti-components/corrections` has never been published to
npm, so its catalog entry is still a `pkg.pr.new` URL. Nothing in this workspace
consumes it, so pnpm never resolves it here — it is the extracted
`qti-editor-full-assessment` repository that actually installs that package, and
it is the last pkgr dependency anywhere.

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
`.pnpmfile.cjs`, `qti-overrides:*`). That workflow was replaced by
pkg.pr.new SHA pinning, and that in turn by the npm ranges above, but some of
its files are still present and effectively dormant:

- `.pnpmfile.cjs` — its `readPackage` hook no-ops as soon as it can't find
  `pnpm-local-overrides.json` (deleted), which is always, today.
- `scripts/qti-local-overrides-sync.mjs`, `scripts/qti-overrides-preinstall.mjs`,
  `scripts/dev-linked.mjs`, `scripts/yalc-init.mjs`, and the root
  `package.json` scripts `qti-overrides:*`, `yalc:*`, `dev:linked` — unused
  by the current workflow.

None of this needs to be run, and running it does nothing useful without a
committed `pnpm-local-overrides.json` to drive it.

