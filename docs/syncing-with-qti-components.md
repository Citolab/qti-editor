# Syncing the editor with a local `qti-components` checkout

> **Status:** temporary documentation while the editor consumes the
> `breaking-changes-for-editor-release` branch of qti-components. Once
> qti-components ships a release with those breaking changes, this whole
> workflow collapses back into "install from npm" and this doc can be removed.

This editor depends on packages from a sibling repo, **qti-components**. There
are two states you'll encounter:

- **Local development:** you want the editor to pick up live changes from your
  local qti-components checkout as you save files.
- **Committed state:** when you `git push` the editor, your teammates and CI
  must be able to clone, run `pnpm install`, and get **byte-identical**
  dependency contents — without having qti-components on their machine.

We solve both with one workflow.

---

## TL;DR — the three commands you actually run

```sh
# 1. Start dev mode
pnpm dev:linked

# 2. Make changes in qti-components, save. The editor reloads automatically.

# 3. When ready to commit on the editor side:
cd /path/to/qti-components && git push      # push qti-components first
cd /path/to/QTI-Editor
pnpm qti-overrides:snapshot                 # pin to that SHA + generate tarballs
git commit -m "..." && git push             # commit + push the editor
```

That's it. Everything else is automated.

---

## What the three commands actually do

### `pnpm dev:linked`

Runs two processes in parallel:

- In `qti-components`: a watcher that rebuilds each affected package on save
  and pushes the new build into the editor's `.yalc/` directories.
- In `qti-prosemirror-item`: the Vite dev server on
  [http://localhost:5175](http://localhost:5175).

A preflight step ensures yalc state is set up. On a fresh checkout it runs
`pnpm yalc:init` once; otherwise it restores yalc state (`pnpm yalc:add` →
`pnpm -r exec yalc restore`).

### `pnpm qti-overrides:snapshot`

The bridge between dev mode and committed state. Reads which
`@qti-components/*` packages you've yalc-linked, captures `qti-components`'
current HEAD commit SHA, verifies that SHA is pushed to a remote, then writes:

- `pnpm-local-overrides.json#enabled` → `true`
- `pnpm-local-overrides.json#sourceOverrides` → one entry per linked package,
  pointing at `github:Citolab/qti-components#<sha>&path:/packages/...`

It then calls `pnpm qti-overrides:sync` which clones qti-components at that
SHA, runs `pnpm pack` on each package, drops the `.tgz` files into
`.qti-components-packs/<sha>/`, and writes the `file:` paths back into
`pnpm-local-overrides.json#overrides`. Finally it `git add`s the json so it
ships with your next commit.

After this runs, the committed state contains exactly one piece of
qti-components-related metadata: the json file with the SHA. Tarballs are
gitignored.

### `git commit`

A pre-commit hook strips any `file:.yalc/...` entries from staged
`package.json` files (so the npm-version specs you see in `dependencies` look
the same as they always did). The hook does **not** touch
`pnpm-local-overrides.json` — that's the file that carries the pinned SHA into
the commit.

---

## What teammates and CI do

Just clone and install:

```sh
git clone <editor-repo>
cd editor
pnpm install
```

That's it. `.pnpmfile.cjs`'s `readPackage` hook — which pnpm runs *before* the
`preinstall` lifecycle script — self-heals inline: if `pnpm-local-overrides.json#enabled`
is true and a pinned tarball is missing locally, it synchronously runs
`qti-overrides:sync` to generate the tarballs, then re-reads the json before
rewiring the workspace's deps to point at them. The `preinstall` script
(`scripts/qti-overrides-preinstall.mjs`) does the same detection/sync as a
redundant safety net, for the (normally unreachable) case where it runs first.

They do **not** need:
- a qti-components checkout
- yalc
- to know any of this exists

If they want to *also* develop against a local qti-components, they run
`pnpm yalc:init` once and then `pnpm dev:linked`. That layers their local
yalc state on top of the committed packs state. The packs state is the
fallback — yalc takes precedence while active.

---

## File guide

| File | Role |
|---|---|
| [`pnpm-local-overrides.json`](../pnpm-local-overrides.json) | Single source of truth for pinned overrides. Committed. |
| [`.pnpmfile.cjs`](../.pnpmfile.cjs) | pnpm hook that reads the json, self-heals missing tarballs inline, and rewrites deps at install time. Committed. |
| [`scripts/qti-local-overrides-sync.mjs`](../scripts/qti-local-overrides-sync.mjs) | `sync` / `status` / `snapshot` subcommands. |
| [`scripts/qti-overrides-preinstall.mjs`](../scripts/qti-overrides-preinstall.mjs) | Self-heals missing tarballs before `pnpm install`. |
| [`scripts/yalc-init.mjs`](../scripts/yalc-init.mjs) | First-time yalc link for the developer. |
| [`scripts/dev-linked.mjs`](../scripts/dev-linked.mjs) | Backs `pnpm dev:linked`. |
| `.qti-components-packs/<sha>/` | Generated tarball cache. Gitignored. Safe to delete; will be regenerated. |
| `**/yalc.lock`, `**/.yalc/` | Per-consumer yalc state. Gitignored. |

---

## Common situations

### "I forgot to push qti-components before snapshot"

Snapshot will refuse with a clear error:

```
qti-components HEAD <sha> is not pushed to any remote.
Push the qti-components branch first, then re-run snapshot.
```

Push qti-components and re-run snapshot.

### "Teammate's `pnpm install` failed with ENOENT on a .tgz"

The preinstall self-heal should prevent this. If it didn't, manually run
`pnpm qti-overrides:install` once — that forces the sync and then installs.
Then file an issue: the preinstall should have caught it.

### "I want to switch back to plain npm versions for everyone"

Edit `pnpm-local-overrides.json` and set `"enabled": false`. Commit + push.
Run `pnpm install`. Teammates run `pnpm install` after pulling. Everything
resolves from npm again.

### "I want to test a different qti-components SHA without changing my checkout"

Edit `pnpm-local-overrides.json#sourceOverrides` by hand, pasting the desired
SHA into each entry. Run `pnpm qti-overrides:sync` (or `:install`). The
snapshot command is just a convenience that automates this for the
"snapshot whatever's at HEAD" case.

### "How do I know what's pinned right now?"

```sh
pnpm qti-overrides:status
```

Prints the `enabled` flag, the source overrides (with their SHAs), and the
resolved tarball paths.

---

## Why this design

Three competing requirements:

1. **Live updates from local qti-components during dev.** yalc handles this.
2. **Reproducibility across machines on commit.** packs (SHA-pinned tarballs)
   handle this — the SHA is the same on every clone, the tarballs are
   regenerated from the same git tree, byte-identical results.
3. **Don't expose either to teammates as part of the daily flow.**
   `preinstall` self-heals, the pre-commit hook strips yalc state, and the
   pnpmfile rewires deps transparently.

The snapshot command exists because (1) and (2) need different kinds of
state, and the natural transition from one to the other is "I'm done with
this round of changes, capture them." Without snapshot you'd be hand-editing
SHAs into json before every commit.

When qti-components ships a stable release containing the editor's required
changes, this whole layer becomes unnecessary — every consumer just installs
the published version from npm. Delete `pnpm-local-overrides.json`,
`.pnpmfile.cjs`, the `qti-overrides:*` scripts, the yalc plumbing, and this
document.
