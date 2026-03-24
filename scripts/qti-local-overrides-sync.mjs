import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const localConfigPath = path.join(rootDir, 'pnpm-local-overrides.json');
const packsRoot = path.join(rootDir, '.qti-components-packs');
const gitCacheRoot = path.join(os.tmpdir(), 'qti-components-local-override-cache');

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

function sanitizeForPath(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function tarballNameForPackage(packageName, version) {
  return `${packageName.replace('@', '').replace(/\//g, '-')}-${version}.tgz`;
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
    ref,
    path: params.path,
    gitUrl: `https://github.com/${repo}.git`,
  };
}

function ensureCheckout(gitUrl, ref) {
  fs.mkdirSync(gitCacheRoot, { recursive: true });
  const checkoutDir = path.join(gitCacheRoot, `${sanitizeForPath(gitUrl)}-${sanitizeForPath(ref)}`);

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

function resolveSourceOverrides(config) {
  const explicit = config.sourceOverrides && typeof config.sourceOverrides === 'object'
    ? config.sourceOverrides
    : null;

  if (explicit && Object.keys(explicit).length > 0) {
    return explicit;
  }

  const current = config.overrides && typeof config.overrides === 'object'
    ? config.overrides
    : {};

  return Object.fromEntries(
    Object.entries(current).filter(([, value]) => parseGithubSpec(value) !== null),
  );
}

function sync() {
  if (!fs.existsSync(localConfigPath)) {
    throw new Error(`Missing ${localConfigPath}. Create it first.`);
  }

  const config = readJson(localConfigPath);
  const sourceOverrides = resolveSourceOverrides(config);
  const sourceEntries = Object.entries(sourceOverrides);

  if (sourceEntries.length === 0) {
    console.log('No Git-based source overrides found.');
    return;
  }

  config.sourceOverrides = sourceOverrides;
  if (!config.overrides || typeof config.overrides !== 'object') {
    config.overrides = {};
  }

  const parsedEntries = sourceEntries.map(([packageName, spec]) => {
    const parsed = parseGithubSpec(spec);
    if (!parsed) {
      throw new Error(`Unsupported source override format for ${packageName}: ${spec}`);
    }
    return { packageName, ...parsed };
  });

  const groups = new Map();
  for (const item of parsedEntries) {
    const key = `${item.gitUrl}#${item.ref}`;
    if (!groups.has(key)) groups.set(key, { gitUrl: item.gitUrl, ref: item.ref, items: [] });
    groups.get(key).items.push(item);
  }

  for (const group of groups.values()) {
    const checkoutDir = ensureCheckout(group.gitUrl, group.ref);
    const packDestDir = path.join(packsRoot, sanitizeForPath(group.ref));
    fs.mkdirSync(packDestDir, { recursive: true });

    for (const item of group.items) {
      const relativePackagePath = item.path.replace(/^\//, '');
      const packageDir = path.join(checkoutDir, relativePackagePath);
      const manifestPath = path.join(packageDir, 'package.json');

      if (!fs.existsSync(manifestPath)) {
        throw new Error(`No package.json found for ${item.packageName} at ${item.path}`);
      }

      const sourceManifest = readJson(manifestPath);
      if (sourceManifest.name !== item.packageName) {
        throw new Error(
          `Override key ${item.packageName} does not match package name ${sourceManifest.name} at ${item.path}`,
        );
      }

      run('pnpm', ['--filter', `${item.packageName}...`, 'build'], { cwd: checkoutDir });
      run('pnpm', ['--filter', item.packageName, 'pack', '--pack-destination', packDestDir], {
        cwd: checkoutDir,
      });

      const tarballName = tarballNameForPackage(item.packageName, sourceManifest.version);
      const tarballPath = path.join(packDestDir, tarballName);
      if (!fs.existsSync(tarballPath)) {
        throw new Error(`Expected tarball not found: ${tarballPath}`);
      }

      const fileOverride = `file:${path.posix.join('.qti-components-packs', sanitizeForPath(group.ref), tarballName)}`;
      config.overrides[item.packageName] = fileOverride;
      console.log(`${item.packageName} -> ${fileOverride}`);
    }
  }

  writeJson(localConfigPath, config);
  console.log(`Updated ${path.basename(localConfigPath)} with file-based overrides.`);
}

function status() {
  if (!fs.existsSync(localConfigPath)) {
    console.log(`${path.basename(localConfigPath)} not found.`);
    return;
  }

  const config = readJson(localConfigPath);
  console.log(`enabled: ${config.enabled === true}`);

  const sourceOverrides = resolveSourceOverrides(config);
  const sourceEntries = Object.entries(sourceOverrides);
  console.log('\nsourceOverrides:');
  if (sourceEntries.length === 0) {
    console.log('  (none)');
  } else {
    for (const [name, value] of sourceEntries) {
      console.log(`  ${name}: ${value}`);
    }
  }

  const activeOverrides = config.overrides && typeof config.overrides === 'object'
    ? Object.entries(config.overrides)
    : [];

  console.log('\noverrides:');
  if (activeOverrides.length === 0) {
    console.log('  (none)');
  } else {
    for (const [name, value] of activeOverrides) {
      console.log(`  ${name}: ${value}`);
    }
  }
}

const command = process.argv[2] ?? 'sync';

if (command === 'sync') {
  sync();
} else if (command === 'status') {
  status();
} else {
  console.error('Usage: node scripts/qti-local-overrides-sync.mjs <sync|status>');
  process.exit(1);
}
