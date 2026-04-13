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
    '@semantic-release/npm',
    ['@semantic-release/git', {
      assets: [changelog, 'package.json'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    }],
    '@semantic-release/github',
  ],
};
