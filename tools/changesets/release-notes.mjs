// Print the CHANGELOG.md section for one version of a package, used as the body
// of the GitHub release.
//
// qti-components hardcodes its umbrella package here because it has exactly one
// package worth announcing. This repo publishes three independent packages on
// independent versions, so the package directory is an argument: the release
// workflow announces @citolab/prose-qti (the flagship a host actually installs),
// and the same script can announce any of the others without being edited.
import { existsSync, readFileSync } from 'node:fs';

const [packageDir, version] = process.argv.slice(2);
if (!packageDir || !version) {
  console.error('usage: release-notes.mjs <package-dir> <version>');
  process.exit(1);
}

const CHANGELOG = `${packageDir}/CHANGELOG.md`;
const fallback = `Release ${version}.`;

if (!existsSync(CHANGELOG)) {
  console.log(fallback);
  process.exit(0);
}

// Changesets writes one `## <version>` section per release; take the lines between
// that heading and the next one.
const lines = readFileSync(CHANGELOG, 'utf8').split('\n');
const start = lines.findIndex(line => line.trim() === `## ${version}`);

let body = '';
if (start !== -1) {
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

console.log(body || fallback);
