// Resolve root regardless of which package directory semantic-release runs from.
// In CI, GITHUB_WORKSPACE is the repo root. Locally, pnpm exec runs from the repo root.
const rootDir = process.env.GITHUB_WORKSPACE ?? process.cwd();
const changelog = `${rootDir}/CHANGELOG.md`;

module.exports = {
  branches: ['main'],
  repositoryUrl: 'https://github.com/Citolab/qti-editor.git',
  tagFormat: '${name}@${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', { changelogFile: changelog }],
    ['@semantic-release/exec', {
      // Update package.json version without creating a git tag (git plugin handles that).
      prepareCmd: 'npm version ${nextRelease.version} --no-git-tag-version --allow-same-version',
      // pnpm publish rewrites workspace:* refs to real versions before publishing.
      // --provenance uses the GitHub Actions OIDC token for npm trusted publisher auth.
      publishCmd: 'pnpm publish --provenance --access public --no-git-checks',
    }],
    ['@semantic-release/git', {
      /*
       * The CHANGELOG only — package.json is deliberately NOT committed back.
       *
       * multi-semantic-release resolves the pnpm workspace protocol in every manifest before
       * publishing, turning `"@citolab/prose-extensions": "workspace:*"` into a concrete version.
       * That is right for the tarball and wrong for this repo, and it is not optional:
       * lib/updateDeps.js calls substituteWorkspaceVersion() BEFORE it consults --deps.bump, so
       * even `--deps.bump=ignore` cannot prevent it.
       *
       * Committing that rewrite back left package.json disagreeing with pnpm-lock.yaml, which
       * fails `pnpm install --frozen-lockfile`. Release commits carry [skip ci], so CI never said
       * so — the breakage surfaced on the next ordinary push, pointing at a manifest nobody had
       * touched. Worse than a red build: with the pin in place a local install resolves the
       * PUBLISHED prose-extensions rather than this workspace's, so editing that package silently
       * stops affecting its dependants.
       *
       * Nothing is lost by not committing it. Versions come from git tags (see tagFormat), the
       * exec plugin above runs `npm version` in the CI workspace before publish, and pnpm rewrites
       * workspace refs at publish time as well. The only consequence is that the `version` field
       * in the committed package.json no longer tracks the released version — the tags do.
       */
      assets: [changelog],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    }],
    '@semantic-release/github',
  ],
};
