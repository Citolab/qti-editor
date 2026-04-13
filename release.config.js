// Resolve root regardless of which package directory semantic-release runs from.
// In CI, GITHUB_WORKSPACE is the repo root. Locally, pnpm exec runs from the repo root.
const rootDir = process.env.GITHUB_WORKSPACE ?? process.cwd();
const changelog = `${rootDir}/CHANGELOG.md`;

export default {
  branches: ['main'],
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
      assets: [changelog, 'package.json'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    }],
    '@semantic-release/github',
  ],
};
