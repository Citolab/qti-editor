import fs from 'node:fs';
import path from 'node:path';

const rootDir = '/Users/patrickklein/Projects/Webcomponents/Editor/qti-editor';
const packageJsonPath = path.join(rootDir, 'package.json');
const qtiComponentsRoot = '/Users/patrickklein/Projects/Edtech/QTI/QTI-Components';

const linkOverrides = {
  '@qti-components/interactions-core': `link:${path.join(qtiComponentsRoot, 'packages/interactions/core')}`,
  '@qti-components/choice-interaction': `link:${path.join(qtiComponentsRoot, 'packages/interactions/choice-interaction')}`,
};

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function writePackageJson(packageJson) {
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function ensureOverrides(packageJson) {
  if (!packageJson.pnpm) packageJson.pnpm = {};
  if (!packageJson.pnpm.overrides) packageJson.pnpm.overrides = {};
  return packageJson.pnpm.overrides;
}

function enableLinks() {
  const packageJson = readPackageJson();
  const overrides = ensureOverrides(packageJson);
  Object.assign(overrides, linkOverrides);
  writePackageJson(packageJson);
  console.log('Enabled local QTI-Components link overrides.');
  printNextSteps();
}

function disableLinks() {
  const packageJson = readPackageJson();
  const overrides = ensureOverrides(packageJson);
  for (const key of Object.keys(linkOverrides)) {
    delete overrides[key];
  }
  writePackageJson(packageJson);
  console.log('Disabled local QTI-Components link overrides.');
  printNextSteps();
}

function status() {
  const packageJson = readPackageJson();
  const overrides = packageJson.pnpm?.overrides ?? {};
  const enabled = Object.entries(linkOverrides).filter(([key, value]) => overrides[key] === value);

  if (enabled.length === Object.keys(linkOverrides).length) {
    console.log('QTI-Components link overrides are ON.');
  } else if (enabled.length === 0) {
    console.log('QTI-Components link overrides are OFF.');
  } else {
    console.log('QTI-Components link overrides are PARTIAL.');
  }

  for (const [key, value] of Object.entries(linkOverrides)) {
    const activeValue = overrides[key];
    console.log(`${key}: ${activeValue === value ? 'linked' : activeValue ? `custom (${activeValue})` : 'registry'}`);
  }
}

function printNextSteps() {
  console.log('Next: run `CI=true pnpm install --no-frozen-lockfile` to apply the change.');
}

const command = process.argv[2];

switch (command) {
  case 'on':
    enableLinks();
    break;
  case 'off':
    disableLinks();
    break;
  case 'status':
    status();
    break;
  default:
    console.error('Usage: node scripts/qti-components-links.mjs <on|off|status>');
    process.exit(1);
}
