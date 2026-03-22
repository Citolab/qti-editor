import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = '/Users/patrickklein/Projects/Webcomponents/Editor/qti-editor';
const packageJsonPath = path.join(rootDir, 'package.json');
const qtiComponentsRoot = '/Users/patrickklein/Projects/Edtech/QTI/QTI-Components';
const localPacksDir = path.join(qtiComponentsRoot, '.local-packs');

const packageConfigs = [
  {
    name: '@qti-components/interactions-core',
    dir: path.join(qtiComponentsRoot, 'packages/interactions/core'),
  },
  {
    name: '@qti-components/choice-interaction',
    dir: path.join(qtiComponentsRoot, 'packages/interactions/choice-interaction'),
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writePackageJson(packageJson) {
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function readRootPackageJson() {
  return readJson(packageJsonPath);
}

function ensureOverrides(packageJson) {
  if (!packageJson.pnpm) packageJson.pnpm = {};
  if (!packageJson.pnpm.overrides) packageJson.pnpm.overrides = {};
  return packageJson.pnpm.overrides;
}

function tarballNameForPackage(packageName, version) {
  return `${packageName.replace('@', '').replace(/\//g, '-')}-${version}.tgz`;
}

function getLinkOverrides() {
  return Object.fromEntries(
    packageConfigs.map(pkg => [pkg.name, `link:${pkg.dir}`]),
  );
}

function getPackOverrides() {
  return Object.fromEntries(
    packageConfigs.map(pkg => {
      const packageJson = readJson(path.join(pkg.dir, 'package.json'));
      const tarballName = tarballNameForPackage(pkg.name, packageJson.version);
      return [pkg.name, `file:${path.join(localPacksDir, tarballName)}`];
    }),
  );
}

function setStrategy(strategy) {
  const packageJson = readRootPackageJson();
  const overrides = ensureOverrides(packageJson);
  const managedKeys = packageConfigs.map(pkg => pkg.name);

  for (const key of managedKeys) {
    delete overrides[key];
  }

  if (strategy === 'link') {
    Object.assign(overrides, getLinkOverrides());
  } else if (strategy === 'pack') {
    Object.assign(overrides, getPackOverrides());
  }

  writePackageJson(packageJson);
  console.log(`QTI-Components strategy set to ${strategy}.`);
  console.log('Next: run `CI=true pnpm install --no-frozen-lockfile` to apply the change.');
}

function refreshPacks() {
  fs.mkdirSync(localPacksDir, { recursive: true });

  for (const pkg of packageConfigs) {
    execFileSync('pnpm', ['build'], {
      cwd: pkg.dir,
      stdio: 'inherit',
    });
    execFileSync('pnpm', ['pack', '--pack-destination', localPacksDir], {
      cwd: pkg.dir,
      stdio: 'inherit',
    });
  }

  console.log(`Refreshed local QTI-Components packs in ${localPacksDir}`);
}

function status() {
  const overrides = readRootPackageJson().pnpm?.overrides ?? {};
  const linkOverrides = getLinkOverrides();
  const packOverrides = getPackOverrides();

  let strategy = 'off';
  if (packageConfigs.every(pkg => overrides[pkg.name] === linkOverrides[pkg.name])) {
    strategy = 'link';
  } else if (packageConfigs.every(pkg => overrides[pkg.name] === packOverrides[pkg.name])) {
    strategy = 'pack';
  } else if (packageConfigs.some(pkg => overrides[pkg.name])) {
    strategy = 'partial';
  }

  console.log(`QTI-Components strategy: ${strategy}`);
  for (const pkg of packageConfigs) {
    console.log(`${pkg.name}: ${overrides[pkg.name] ?? 'registry'}`);
  }
}

const command = process.argv[2];

switch (command) {
  case 'link-on':
    setStrategy('link');
    break;
  case 'pack-on':
    setStrategy('pack');
    break;
  case 'off':
    setStrategy('off');
    break;
  case 'status':
    status();
    break;
  case 'pack-refresh':
    refreshPacks();
    break;
  default:
    console.error('Usage: node scripts/qti-components-source.mjs <link-on|pack-on|off|status|pack-refresh>');
    process.exit(1);
}
