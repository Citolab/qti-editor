import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');
const packsRoot = path.join(rootDir, '.qti-components-packs');
const gitCacheRoot = path.join(os.tmpdir(), 'qti-components-git-override-cache');

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, {
    stdio: 'inherit',
    ...options,
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseGithubSpec(spec) {
  if (typeof spec !== 'string') return null;

  let repo;
  let suffix;

  if (spec.startsWith('github:')) {
    const body = spec.slice('github:'.length);
    const hashIndex = body.indexOf('#');
    if (hashIndex === -1) return null;
    repo = body.slice(0, hashIndex);
    suffix = body.slice(hashIndex + 1);
  } else if (spec.startsWith('https://github.com/')) {
    const body = spec.slice('https://github.com/'.length);
    const hashIndex = body.indexOf('#');
    if (hashIndex === -1) return null;
    repo = body.slice(0, hashIndex).replace(/\.git$/, '');
    suffix = body.slice(hashIndex + 1);
  } else {
    return null;
  }

  const [ref, ...paramPairs] = suffix.split('&');
  if (!repo || !ref) return null;

  const params = Object.fromEntries(
    paramPairs
      .map(pair => pair.split(':'))
      .filter(parts => parts.length >= 2)
      .map(([k, ...rest]) => [k, rest.join(':')]),
  );

  if (!params.path) return null;

  return {
    raw: spec,
    repo,
    ref,
    path: params.path,
    gitUrl: `https://github.com/${repo}.git`,
  };
}

function tarballNameForPackage(packageName, version) {
  return `${packageName.replace('@', '').replace(/\//g, '-')}-${version}.tgz`;
}

function sanitizeForPath(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getOverrideSources(packageJson) {
  const pnpm = packageJson.pnpm ?? {};
  const overrides = pnpm.overrides ?? {};
  const gitOverrides = packageJson.qtiComponentsGitOverrides ?? packageJson.pnpm?.gitOverrides ?? {};

  const fromOverrides = Object.entries(overrides)
    .map(([name, spec]) => [name, parseGithubSpec(spec)])
    .filter(([, parsed]) => parsed !== null);

  if (fromOverrides.length > 0) {
    return {
      source: 'overrides',
      entries: Object.fromEntries(fromOverrides.map(([name, parsed]) => [name, parsed])),
      rawSpecs: Object.fromEntries(fromOverrides.map(([name, parsed]) => [name, parsed.raw])),
    };
  }

  const fromGitOverrides = Object.entries(gitOverrides)
    .map(([name, spec]) => [name, parseGithubSpec(spec)])
    .filter(([, parsed]) => parsed !== null);

  return {
    source: 'gitOverrides',
    entries: Object.fromEntries(fromGitOverrides.map(([name, parsed]) => [name, parsed])),
    rawSpecs: Object.fromEntries(fromGitOverrides.map(([name, parsed]) => [name, parsed.raw])),
  };
}

function ensureCheckout(gitUrl, ref) {
  const checkoutDir = path.join(gitCacheRoot, `${sanitizeForPath(gitUrl)}-${sanitizeForPath(ref)}`);
  fs.mkdirSync(gitCacheRoot, { recursive: true });

  if (!fs.existsSync(path.join(checkoutDir, '.git'))) {
    run('git', ['clone', gitUrl, checkoutDir]);
  } else {
    run('git', ['fetch', '--all', '--tags'], { cwd: checkoutDir });
  }
  run('git', ['checkout', ref], { cwd: checkoutDir });
  if (!fs.existsSync(path.join(checkoutDir, 'node_modules'))) {
    run('pnpm', ['install', '--ignore-scripts'], { cwd: checkoutDir });
  }

  return checkoutDir;
}

function fileOverrideExists(overrideValue) {
  if (typeof overrideValue !== 'string' || !overrideValue.startsWith('file:')) return false;
  const relativePath = overrideValue.slice('file:'.length);
  return fs.existsSync(path.join(rootDir, relativePath));
}

function syncOverrides() {
  const packageJson = readJson(packageJsonPath);
  if (!packageJson.pnpm) packageJson.pnpm = {};
  if (!packageJson.pnpm.overrides) packageJson.pnpm.overrides = {};

  const { entries, rawSpecs } = getOverrideSources(packageJson);
  const packageNames = Object.keys(entries);

  if (packageNames.length === 0) {
    console.log('No GitHub override specs found in pnpm.overrides or qtiComponentsGitOverrides.');
    return;
  }

  packageJson.qtiComponentsGitOverrides = {
    ...(packageJson.qtiComponentsGitOverrides ?? {}),
    ...rawSpecs,
  };

  const groups = new Map();
  for (const [packageName, spec] of Object.entries(entries)) {
    const key = `${spec.gitUrl}#${spec.ref}`;
    if (!groups.has(key)) groups.set(key, { gitUrl: spec.gitUrl, ref: spec.ref, items: [] });
    groups.get(key).items.push({ packageName, spec });
  }

  for (const group of groups.values()) {
    const packDestDir = path.join(packsRoot, sanitizeForPath(group.ref));
    fs.mkdirSync(packDestDir, { recursive: true });

    const pendingItems = [];
    for (const item of group.items) {
      const currentOverride = packageJson.pnpm.overrides[item.packageName];
      const expectedPrefix = `file:${path.posix.join('.qti-components-packs', sanitizeForPath(group.ref))}/`;
      if (typeof currentOverride === 'string' && currentOverride.startsWith(expectedPrefix) && fileOverrideExists(currentOverride)) {
        console.log(`${item.packageName} -> ${currentOverride} (reused)`);
        continue;
      }
      pendingItems.push(item);
    }

    if (pendingItems.length === 0) continue;

    const checkoutDir = ensureCheckout(group.gitUrl, group.ref);
    for (const { packageName, spec } of pendingItems) {
      const relativePackagePath = spec.path.replace(/^\//, '');
      const packageDir = path.join(checkoutDir, relativePackagePath);
      const packageManifestPath = path.join(packageDir, 'package.json');

      if (!fs.existsSync(packageManifestPath)) {
        throw new Error(`No package.json found for ${packageName} at ${spec.path}`);
      }

      const sourcePackageJson = readJson(packageManifestPath);
      if (sourcePackageJson.name !== packageName) {
        throw new Error(
          `Override key ${packageName} does not match package name ${sourcePackageJson.name} at ${spec.path}`,
        );
      }

      run('pnpm', ['--filter', `${packageName}...`, 'build'], { cwd: checkoutDir });
      run('pnpm', ['--filter', packageName, 'pack', '--pack-destination', packDestDir], {
        cwd: checkoutDir,
      });

      const tarballName = tarballNameForPackage(packageName, sourcePackageJson.version);
      const tarballPath = path.join(packDestDir, tarballName);
      if (!fs.existsSync(tarballPath)) {
        throw new Error(`Expected tarball was not created: ${tarballPath}`);
      }

      const fileOverride = `file:${path.posix.join('.qti-components-packs', sanitizeForPath(group.ref), tarballName)}`;
      packageJson.pnpm.overrides[packageName] = fileOverride;
      console.log(`${packageName} -> ${fileOverride}`);
    }
  }

  writeJson(packageJsonPath, packageJson);
  console.log('Git overrides synced to local file tarballs.');
  console.log('Next: run `pnpm install --no-frozen-lockfile`.');
}

function status() {
  const packageJson = readJson(packageJsonPath);
  const overrides = packageJson.pnpm?.overrides ?? {};
  const gitOverrides = packageJson.qtiComponentsGitOverrides ?? {};

  console.log('pnpm.overrides:');
  for (const [name, value] of Object.entries(overrides)) {
    console.log(`  ${name}: ${value}`);
  }

  console.log('\nqtiComponentsGitOverrides:');
  for (const [name, value] of Object.entries(gitOverrides)) {
    console.log(`  ${name}: ${value}`);
  }
}

const command = process.argv[2] ?? 'sync';

if (command === 'sync') {
  syncOverrides();
} else if (command === 'status') {
  status();
} else {
  console.error('Usage: node scripts/qti-components-git-overrides.mjs <sync|status>');
  process.exit(1);
}
