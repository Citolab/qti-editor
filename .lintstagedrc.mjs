/**
 * Pre-commit tasks, staged files only. Mirrors QTI-Components' .lintstagedrc.mjs.
 *
 * Before this, the pre-commit hook ran `eslint .` over the whole repo and **no tests at all**. The
 * repo it depends on has a story suite that catches rendering regressions; this one had nothing
 * between a broken editor and a commit.
 *
 * ── Why `--changed` ─────────────────────────────────────────────────────────────────────────────
 *
 * It is seeded from git rather than from a file-extension glob, so a commit that touches only CSS
 * still reaches the tests that render the elements reading it. A glob-seeded `vitest related` cannot
 * do that, and the drop-sizing regression in the sibling repo — 128px hotspots, silently shrunken
 * match cards — was exactly a CSS-only change.
 *
 * ── Why this is staged-only ─────────────────────────────────────────────────────────────────────
 *
 * `--changed` with no value means "uncommitted, staged AND unstaged". On its own that is the wrong
 * gate: an unstaged fix in the working tree can make a staged bug pass, and the commit goes out
 * green. It is staged-only here because of two things together — the vitest call lives inside
 * lint-staged, and the hook passes `--hide-unstaged` so every unstaged change is stashed for the
 * run. That flag is NOT the default: lint-staged normally hides only partially staged files, which
 * leaves a fully unstaged edit right where `--changed` will find it. Both halves are required.
 *
 * No prettier or stylelint entry: neither is a dependency of this repo. eslint is, and the hook
 * already ran it — narrowed here to the staged files, which is also what makes the hook fast.
 */
export default {
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['eslint --fix'],

  /*
   * One test run for the whole commit.
   *
   * The function form returns a bare command string, which is what stops lint-staged appending the
   * matched filenames — `vitest --changed` derives its own set from git and would read a file list
   * as a name filter, narrowing the run to nothing.
   *
   * Not the VRT project: that one is gated behind VRT=1 and lives in `just vrt`. Baselines here
   * record whichever qti-components copy was linked when they were taken, so a commit-time VRT gate
   * would fail for everyone whose link mode differs from whoever last ran `just screenshots`.
   */
  '*': () => 'vitest run --changed --passWithNoTests'
};
